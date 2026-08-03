/**
 * Notification badges — RC2 Blocker 2.
 *
 * One count per destination, shared by every navigation surface. The rules
 * about what is pending live in the read models (`SocialReadModel`,
 * `HomeReadModel`); this hook only asks them, keeps the answer fresh, and
 * remembers which acceptances a person has already seen.
 *
 * Freshness without new infrastructure: a short poll while the tab is visible,
 * an immediate re-read whenever the tab regains focus, and an explicit
 * `refreshBadges()` broadcast that any action (accepting a request, sending an
 * invite) can fire to update the count in the same interaction.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  HOME_READ_MODEL,
  SOCIAL_READ_MODEL,
  isServiceBound,
  resolveService,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "notifications";

/** How often the counts are re-read while the tab is visible. */
const POLL_INTERVAL_MS = 15_000;

const SEEN_STORAGE_KEY = "sf.notifications.seen-invites";
const REFRESH_EVENT = "sf:notifications:refresh";

export interface NotificationBadges {
  /** Incoming friend requests waiting on this person. */
  readonly friendRequests: number;
  /** Room invitations still open, plus acceptances not yet looked at. */
  readonly roomInvites: number;
  readonly total: number;
  refresh(): void;
  /** Called by the invitations screen: acceptances have now been seen. */
  markInvitesSeen(): void;
}

export const EMPTY_BADGES = Object.freeze({ friendRequests: 0, roomInvites: 0, total: 0 });

/** Any surface can ask every mounted badge reader to re-check immediately. */
export function refreshBadges(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

function readSeen(): readonly string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    // Bounded: only the most recent answers matter for a badge.
    window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(ids.slice(0, 100)));
  } catch {
    // A browser refusing storage simply shows the badge again. Never fatal.
  }
}

export function useNotificationBadges(viewerProfileId: string | null): NotificationBadges {
  const [counts, setCounts] = useState(EMPTY_BADGES);
  const [token, setToken] = useState(0);
  const seenRef = useRef<readonly string[]>([]);

  const social = useMemo(
    () => (isServiceBound(SOCIAL_READ_MODEL) ? resolveService(SOCIAL_READ_MODEL) : null),
    [],
  );
  const home = useMemo(
    () => (isServiceBound(HOME_READ_MODEL) ? resolveService(HOME_READ_MODEL) : null),
    [],
  );

  const refresh = useCallback(() => setToken((value) => value + 1), []);

  useEffect(() => {
    seenRef.current = readSeen();
  }, []);

  useEffect(() => {
    if (!viewerProfileId || (!social && !home)) {
      setCounts(EMPTY_BADGES);
      return;
    }

    let active = true;

    const read = async () => {
      try {
        const [overview, snapshot] = await Promise.all([
          social ? social.load(viewerProfileId) : Promise.resolve(null),
          home ? home.loadHome(viewerProfileId) : Promise.resolve(null),
        ]);
        if (!active) return;

        const friendRequests = overview?.incomingRequests.length ?? 0;
        const pending = snapshot?.pendingInvites.length ?? 0;
        const unseenAnswers = (snapshot?.answeredInvites ?? []).filter(
          (entry) =>
            entry.invite.status === "accepted" && !seenRef.current.includes(entry.invite.id),
        ).length;
        const roomInvites = pending + unseenAnswers;

        setCounts({ friendRequests, roomInvites, total: friendRequests + roomInvites });
      } catch (error) {
        // A badge is decoration: a failed read leaves the last known count.
        logger.warn("Notification badge read failed", { module: MODULE, error });
      }
    };

    void read();

    const onExternalRefresh = () => void read();
    const onVisible = () => {
      if (document.visibilityState === "visible") void read();
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void read();
    }, POLL_INTERVAL_MS);

    window.addEventListener(REFRESH_EVENT, onExternalRefresh);
    window.addEventListener("focus", onExternalRefresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(REFRESH_EVENT, onExternalRefresh);
      window.removeEventListener("focus", onExternalRefresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [home, social, token, viewerProfileId]);

  const markInvitesSeen = useCallback(async () => {
    if (!home || !viewerProfileId) return;
    try {
      const snapshot = await home.loadHome(viewerProfileId);
      const ids = snapshot.answeredInvites.map((entry) => entry.invite.id);
      seenRef.current = Array.from(new Set([...ids, ...seenRef.current]));
      writeSeen(seenRef.current);
      refresh();
    } catch (error) {
      logger.warn("Marking invitations seen failed", { module: MODULE, error });
    }
  }, [home, refresh, viewerProfileId]);

  return useMemo(
    () => ({
      ...counts,
      refresh,
      markInvitesSeen: () => void markInvitesSeen(),
    }),
    [counts, markInvitesSeen, refresh],
  );
}
