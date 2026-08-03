/**
 * Social hook — Milestone F.0.
 *
 * The one place the social screens get their data and their actions. Every
 * rule about who may accept, what a block does to a friendship, and which
 * people are hidden lives in `SocialService`; this hook only tracks what is in
 * flight, re-reads afterwards, and lets Po notice the happy moments.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EMPTY_SOCIAL_OVERVIEW,
  SOCIAL_READ_MODEL,
  SOCIAL_SERVICE,
  isServiceBound,
  resolveService,
  type Relationship,
  type SocialOverview,
} from "@/domain";
import { usePoReaction } from "@/features/po";
import { logger } from "@/foundation/logging";

const MODULE = "social";

export interface SocialModel {
  readonly overview: SocialOverview;
  readonly isLoading: boolean;
  /** False when no persistence adapter is bound: the page says so plainly. */
  readonly isAvailable: boolean;
  readonly error: unknown;
  /** Profile id currently being acted on, for per-row busy state. */
  readonly pendingProfileId: string | null;
  refresh(): void;
  /** How the viewer stands with someone, from the already-loaded graph. */
  relationshipWith(profileId: string): Relationship;
  sendRequest(profileId: string): Promise<boolean>;
  acceptRequest(friendshipId: string, profileId: string): Promise<boolean>;
  declineRequest(friendshipId: string, profileId: string): Promise<boolean>;
  cancelRequest(friendshipId: string, profileId: string): Promise<boolean>;
  removeFriend(friendshipId: string, profileId: string): Promise<boolean>;
  blockProfile(profileId: string, reason?: string): Promise<boolean>;
  unblockProfile(profileId: string): Promise<boolean>;
}

export function useSocial(viewerProfileId: string | null): SocialModel {
  const [overview, setOverview] = useState<SocialOverview>(EMPTY_SOCIAL_OVERVIEW);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const po = usePoReaction();

  const readModel = useMemo(
    () => (isServiceBound(SOCIAL_READ_MODEL) ? resolveService(SOCIAL_READ_MODEL) : null),
    [],
  );
  const social = useMemo(
    () => (isServiceBound(SOCIAL_SERVICE) ? resolveService(SOCIAL_SERVICE) : null),
    [],
  );

  useEffect(() => {
    if (!readModel || !viewerProfileId) {
      setOverview(EMPTY_SOCIAL_OVERVIEW);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    readModel
      .load(viewerProfileId)
      .then((next) => {
        if (!active) return;
        setOverview(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        logger.warn("Social overview failed", { module: MODULE, error: cause });
        if (active) setError(cause);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [readModel, reloadToken, viewerProfileId]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const intent = useCallback(
    () => ({ correlationId: crypto.randomUUID(), actorProfileId: viewerProfileId }),
    [viewerProfileId],
  );

  const run = useCallback(
    async (profileId: string, operation: () => Promise<unknown>): Promise<boolean> => {
      if (!social || !viewerProfileId) return false;
      setPendingProfileId(profileId);
      setError(null);
      try {
        await operation();
        refresh();
        return true;
      } catch (cause) {
        logger.warn("Social action failed", { module: MODULE, error: cause });
        setError(cause);
        return false;
      } finally {
        setPendingProfileId(null);
      }
    },
    [refresh, social, viewerProfileId],
  );

  const relationshipWith = useCallback(
    (profileId: string): Relationship => {
      if (!social || !viewerProfileId) return { kind: "none", friendshipId: null };
      return social.classify(viewerProfileId, profileId, overview.friendships, overview.blocks);
    },
    [overview.blocks, overview.friendships, social, viewerProfileId],
  );

  return {
    overview,
    isLoading,
    isAvailable: readModel !== null && readModel.isConfigured,
    error,
    pendingProfileId,
    refresh,
    relationshipWith,

    sendRequest: (profileId) =>
      run(profileId, async () => {
        await social?.sendRequest(viewerProfileId as string, profileId);
        po.react("friend_request_sent");
      }),

    acceptRequest: (friendshipId, profileId) =>
      run(profileId, async () => {
        await social?.acceptRequest(viewerProfileId as string, friendshipId);
        po.react("friend_accepted");
      }),

    declineRequest: (friendshipId, profileId) =>
      run(profileId, () => social!.declineRequest(viewerProfileId as string, friendshipId)),

    cancelRequest: (friendshipId, profileId) =>
      run(profileId, () => social!.cancelRequest(viewerProfileId as string, friendshipId)),

    removeFriend: (friendshipId, profileId) =>
      run(profileId, () => social!.removeFriend(viewerProfileId as string, friendshipId)),

    blockProfile: (profileId, reason = "") =>
      run(profileId, () =>
        social!.blockProfile(viewerProfileId as string, profileId, reason, intent()),
      ),

    unblockProfile: (profileId) =>
      run(profileId, () => social!.unblockProfile(viewerProfileId as string, profileId, intent())),
  };
}
