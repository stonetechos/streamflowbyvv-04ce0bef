/**
 * Room readiness hook — Sprint 2.9.
 *
 * The Feature-layer half of `ReadyCoordinator`. It observes the roster, tracks
 * how long each member has been unconfirmed, and hands everything to Domain for
 * a verdict. It counts nothing and decides nothing: readiness, countdown
 * availability, timeout, and the manual-play reminder are all Domain answers
 * (Sprint 2.9 engineering rule).
 *
 * Announcements are made once per transition, never per re-render.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  READY_COORDINATOR,
  isServiceBound,
  resolveService,
  type MemberPresence,
  type ReadyParticipantInput,
  type ReadySnapshot,
  type RoomSyncSnapshot,
} from "@/domain";
import { useAnnouncer } from "@/foundation/accessibility";
import { useTranslation } from "@/foundation/localization";

import type { MemberView } from "./waiting-room.types";

export interface RoomReadyModel {
  readonly snapshot: ReadySnapshot | null;
  readonly isAvailable: boolean;
  /** True while the viewer's own confirmation is being saved. */
  readonly isConfirming: boolean;
  confirm(): void;
  withdraw(): void;
}

export interface UseRoomReadyInput {
  readonly roomId: string;
  readonly members: readonly MemberView[];
  readonly presenceByProfileId: ReadonlyMap<string, MemberPresence>;
  readonly viewerProfileId: string | null;
  readonly hasProvider: boolean;
  readonly launchPending: boolean;
  readonly syncSnapshot: RoomSyncSnapshot | null;
  readonly enabled: boolean;
  readonly isConfirming: boolean;
  setReady(ready: boolean): void;
}

export function useRoomReady({
  roomId,
  members,
  presenceByProfileId,
  viewerProfileId,
  hasProvider,
  launchPending,
  syncSnapshot,
  enabled,
  isConfirming,
  setReady,
}: UseRoomReadyInput): RoomReadyModel {
  const { t } = useTranslation();
  const announce = useAnnouncer();

  const coordinator = useMemo(
    () => (isServiceBound(READY_COORDINATOR) ? resolveService(READY_COORDINATOR) : null),
    [],
  );

  const [snapshot, setSnapshot] = useState<ReadySnapshot | null>(null);

  // When each joined member was first seen unconfirmed, so Domain can decide
  // whether that wait has gone stale. Observation only — no rule lives here.
  const waitingSince = useRef(new Map<string, number>());
  // Who was present the last time the room reached everyone-ready, so a later
  // arrival can be reported as a late join.
  const established = useRef<readonly string[]>([]);
  const announcedReady = useRef(new Set<string>());
  const announcedEveryone = useRef(false);
  const announcedCountdown = useRef(false);
  const announcedReminder = useRef(false);

  const joined = useMemo(() => members.filter((member) => member.state === "joined"), [members]);

  const participants: readonly ReadyParticipantInput[] = useMemo(() => {
    const now = Date.now();
    const seen = waitingSince.current;
    const next: ReadyParticipantInput[] = joined.map((member) => {
      if (member.isReady) {
        seen.delete(member.profileId);
      } else if (!seen.has(member.profileId)) {
        seen.set(member.profileId, now);
      }
      const presence = presenceByProfileId.get(member.profileId);
      return {
        profileId: member.profileId,
        isJoined: true,
        isOnline: presence?.isOnline ?? member.presence === "online",
        isReady: member.isReady,
        waitingSinceMs: seen.get(member.profileId) ?? null,
      };
    });
    for (const profileId of [...seen.keys()]) {
      if (!joined.some((member) => member.profileId === profileId)) seen.delete(profileId);
    }
    return next;
  }, [joined, presenceByProfileId]);

  useEffect(() => {
    if (!coordinator || !enabled) {
      setSnapshot(null);
      return;
    }
    const next = coordinator.evaluate({
      roomId,
      viewerProfileId,
      participants,
      hasProvider,
      launchPending,
      syncSnapshot,
      establishedProfileIds: established.current,
    });
    if (next.everyoneReady) {
      established.current = next.readyProfileIds;
    }
    setSnapshot(next);
  }, [
    coordinator,
    enabled,
    hasProvider,
    launchPending,
    participants,
    roomId,
    syncSnapshot,
    viewerProfileId,
  ]);

  // Accessibility — one announcement per transition (Foundation §16).
  useEffect(() => {
    if (!snapshot) return;

    for (const member of joined) {
      if (member.isReady && !announcedReady.current.has(member.profileId)) {
        announcedReady.current.add(member.profileId);
        announce(t("room.ready.announce.member_ready", { member: member.label }));
      }
      if (!member.isReady) announcedReady.current.delete(member.profileId);
    }

    if (snapshot.everyoneReady && !announcedEveryone.current) {
      announcedEveryone.current = true;
      announce(t("room.ready.announce.everyone_ready"));
    }
    if (!snapshot.everyoneReady) announcedEveryone.current = false;

    if (snapshot.countdownAvailable && !announcedCountdown.current) {
      announcedCountdown.current = true;
      announce(t("room.ready.announce.countdown_available"));
    }
    if (!snapshot.countdownAvailable) announcedCountdown.current = false;

    if (snapshot.manualPlayReminderDue && !announcedReminder.current) {
      announcedReminder.current = true;
      announce(t("room.ready.announce.manual_play_reminder"));
    }
    if (!snapshot.manualPlayReminderDue) announcedReminder.current = false;
  }, [announce, joined, snapshot, t]);

  const confirm = useCallback(() => setReady(true), [setReady]);
  const withdraw = useCallback(() => setReady(false), [setReady]);

  return {
    snapshot,
    isAvailable: coordinator !== null && enabled,
    isConfirming,
    confirm,
    withdraw,
  };
}
