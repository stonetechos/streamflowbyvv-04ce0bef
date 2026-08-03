/**
 * Room synchronization hook — Sprint 2.6.
 *
 * The Feature-layer half of `RoomSyncCoordinator`. It gathers what the lobby
 * already knows (the roster, presence-carried offsets) and hands it to Domain
 * for a verdict. It computes no health, no band, no eligibility of its own —
 * the sprint's engineering rule is that only `ClockSyncService` and
 * `RoomSyncCoordinator` may answer those questions.
 *
 * Responsibilities, all mechanical:
 *  1. re-evaluate whenever the roster, presence, or this device's clock moves,
 *  2. announce room-health transitions once each, never the chatter beneath,
 *  3. hand the host a gate they can call before scheduling a countdown,
 *  4. re-publish room health over the existing realtime foundation (host only).
 *
 * Nothing here synchronizes playback.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ROOM_SYNC_COORDINATOR,
  crossesHealthCategory,
  isHealthSatisfactory,
  isServiceBound,
  requiresResync,
  resolveService,
  type MemberPresence,
  type ParticipantSyncInput,
  type RoomSyncSnapshot,
  type SyncHealth,
} from "@/domain";
import { useAnnouncer } from "@/foundation/accessibility";
import { logger } from "@/foundation/logging";
import { useTranslation } from "@/foundation/localization";

import { SYNC_HEALTH_KEYS } from "./use-room-clock-sync";
import type { MemberView } from "./waiting-room.types";

const MODULE = "waiting-room-room-sync";

/** How long Po stays visibly relieved after the room recovers. */
const RELIEF_WINDOW_MS = 6_000;

export interface RoomSyncModel {
  readonly snapshot: RoomSyncSnapshot | null;
  readonly health: SyncHealth;
  readonly participantCount: number;
  readonly syncedCount: number;
  /** Foundation §15 — false only while the room needs a re-measure. */
  readonly canStartCountdown: boolean;
  /** Translation key explaining a block, or null when the countdown is free. */
  readonly blockReasonKey: string | null;
  /** Warning band: allowed, advisory shown. */
  readonly hasAdvisory: boolean;
  /** The room is out of step — Po looks concerned. */
  readonly needsResync: boolean;
  /** Briefly true after the room returns to a healthy band — Po relaxes. */
  readonly justRecovered: boolean;
  /** Playback eligibility, as decided by Domain. */
  readonly isPlaybackEligible: boolean;
  readonly isAvailable: boolean;
  /** Throws when Domain refuses the countdown. Used as the host's gate. */
  assertCountdownEligible(): void;
}

export interface UseRoomSyncInput {
  readonly roomId: string;
  readonly members: readonly MemberView[];
  readonly presenceByProfileId: ReadonlyMap<string, MemberPresence>;
  readonly isHost: boolean;
  readonly actorProfileId: string | null;
  /** This device's own health, so a local change triggers re-evaluation. */
  readonly ownHealth: SyncHealth;
  readonly enabled: boolean;
}

export function useRoomSync({
  roomId,
  members,
  presenceByProfileId,
  isHost,
  actorProfileId,
  ownHealth,
  enabled,
}: UseRoomSyncInput): RoomSyncModel {
  const { t } = useTranslation();
  const announce = useAnnouncer();

  const coordinator = useMemo(
    () => (isServiceBound(ROOM_SYNC_COORDINATOR) ? resolveService(ROOM_SYNC_COORDINATOR) : null),
    [],
  );

  const [snapshot, setSnapshot] = useState<RoomSyncSnapshot | null>(null);
  const [justRecovered, setJustRecovered] = useState(false);
  const lastHealth = useRef<SyncHealth>("unknown");

  const available = coordinator !== null && enabled;

  // Only joined members are participants; an invitee has no device in the room.
  const participants: readonly ParticipantSyncInput[] = useMemo(
    () =>
      members
        .filter((member) => member.state === "joined")
        .map((member) => {
          const presence = presenceByProfileId.get(member.profileId);
          return {
            profileId: member.profileId,
            isOnline: presence?.isOnline ?? member.presence === "unknown",
            clockOffsetMs: presence?.clockOffsetMs ?? null,
            latencyMs: presence?.latencyMs ?? null,
          };
        }),
    [members, presenceByProfileId],
  );

  useEffect(() => {
    if (!coordinator || !available) {
      setSnapshot(null);
      return;
    }
    // `ownHealth` participates only as a change signal: the coordinator reads
    // this device's estimate from ClockSyncService itself.
    void ownHealth;
    setSnapshot(coordinator.evaluate(roomId, participants));
  }, [available, coordinator, ownHealth, participants, roomId]);

  const health = snapshot?.health ?? "unknown";

  // Accessibility: meaningful transitions only. A room refreshing every few
  // seconds inside the same band produces exactly zero announcements.
  useEffect(() => {
    if (!crossesHealthCategory(lastHealth.current, health)) {
      lastHealth.current = health;
      return;
    }
    const previous = lastHealth.current;
    lastHealth.current = health;

    announce(
      t("room.sync.announce.room_health_changed", { health: t(SYNC_HEALTH_KEYS[health]) }),
      isHealthSatisfactory(health) ? "polite" : "assertive",
    );

    if (requiresResync(previous) && isHealthSatisfactory(health)) {
      setJustRecovered(true);
    }
  }, [announce, health, t]);

  // The relief beat is a visual courtesy, so it fades on its own.
  useEffect(() => {
    if (!justRecovered) return;
    const timer = window.setTimeout(() => setJustRecovered(false), RELIEF_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [justRecovered]);

  // Realtime fan-out over the existing foundation: the host re-publishes the
  // room's weakest deviation as the existing `DriftMeasured` catalog event.
  //
  // Milestone D.5 — publication is keyed on the health band, never on snapshot
  // identity. Re-evaluating the same band, however often, publishes nothing.
  const snapshotRef = useRef<RoomSyncSnapshot | null>(null);
  snapshotRef.current = snapshot;
  const lastPublishedHealth = useRef<SyncHealth | null>(null);

  useEffect(() => {
    if (!coordinator || !available || !isHost || !actorProfileId) {
      lastPublishedHealth.current = null;
      return;
    }
    const current = snapshotRef.current;
    if (!current || current.worstDeviationMs === null) return;
    if (lastPublishedHealth.current === health) return;
    lastPublishedHealth.current = health;

    void coordinator
      .publishRoomHealth(current, {
        correlationId: crypto.randomUUID(),
        actorProfileId,
      })
      .catch((cause: unknown) => {
        logger.warn("Room health publish failed", { module: MODULE, roomId, error: cause });
      });
  }, [actorProfileId, available, coordinator, health, isHost, roomId]);

  const assertCountdownEligible = useCallback(() => {
    if (!coordinator || !snapshot) return;
    coordinator.assertCountdownEligible(snapshot);
  }, [coordinator, snapshot]);

  return {
    snapshot,
    health,
    participantCount: snapshot?.participantCount ?? 0,
    syncedCount: snapshot?.syncedCount ?? 0,
    canStartCountdown: snapshot ? snapshot.canStartCountdown : true,
    blockReasonKey: snapshot?.blockReason ? `room.room_sync.block.${snapshot.blockReason}` : null,
    hasAdvisory: snapshot?.hasAdvisory ?? false,
    needsResync: requiresResync(health),
    justRecovered,
    isPlaybackEligible: coordinator && snapshot ? coordinator.isPlaybackEligible(snapshot) : true,
    isAvailable: available && coordinator !== null && coordinator.isAvailable(),
    assertCountdownEligible,
  };
}
