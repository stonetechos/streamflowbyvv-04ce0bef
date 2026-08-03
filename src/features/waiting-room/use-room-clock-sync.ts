/**
 * Room clock synchronization hook — Sprint 2.5.
 *
 * The Feature-layer half of clock sync. It measures and reports; it decides
 * nothing. Every rule — how samples are rejected, how the offset is estimated,
 * which band a deviation falls in — lives in the Domain engines.
 *
 * What this hook does:
 *  1. takes a burst on entry (Foundation §15: join, reconnect, before scheduling),
 *  2. runs the lighter periodic refresh while the room is open,
 *  3. publishes `ClockOffsetUpdated` when the estimate settles into a band,
 *  4. announces health only when it crosses between categories.
 *
 * What it deliberately does not do: adjust the countdown, correct playback, or
 * contact any provider. Synchronization health is information this sprint,
 * nothing more.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CLOCK_SYNC_SERVICE,
  isHealthSatisfactory,
  isServiceBound,
  requiresResync,
  resolveService,
  type SyncHealth,
  type SyncSnapshot,
} from "@/domain";
import { logger } from "@/foundation/logging";
import { useTranslation } from "@/foundation/localization";
import { SYNC_RUNTIME } from "@/shared/constants/system-constants";

const MODULE = "waiting-room-clock-sync";

/** Translation key per band; `unknown` is a state, not a band, and says so. */
export const SYNC_HEALTH_KEYS: Readonly<Record<SyncHealth, string>> = Object.freeze({
  excellent: "room.sync.health.excellent",
  good: "room.sync.health.good",
  warning: "room.sync.health.warning",
  resync_required: "room.sync.health.resync_required",
  unknown: "room.sync.health.unknown",
});

export interface RoomClockSyncModel {
  readonly snapshot: SyncSnapshot | null;
  readonly health: SyncHealth;
  /** True in the Excellent or Good band (Foundation §15). */
  readonly isSatisfactory: boolean;
  /** True in the Re-sync Required band. Advisory only this sprint. */
  readonly needsResync: boolean;
  readonly isMeasuring: boolean;
  /** False when no time source is bound; the card renders an unknown state. */
  readonly isAvailable: boolean;
  /** Manual re-measure, offered when health leaves the satisfactory bands. */
  remeasure(): void;
}

export interface UseRoomClockSyncInput {
  readonly roomId: string;
  readonly profileId: string | null;
  readonly enabled: boolean;
}

export function useRoomClockSync({
  roomId,
  profileId,
  enabled,
}: UseRoomClockSyncInput): RoomClockSyncModel {
  const service = useMemo(
    () => (isServiceBound(CLOCK_SYNC_SERVICE) ? resolveService(CLOCK_SYNC_SERVICE) : null),
    [],
  );

  const [snapshot, setSnapshot] = useState<SyncSnapshot | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);

  const mounted = useRef(true);
  const inFlight = useRef(false);

  const available = service !== null && service.isAvailable() && enabled;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const measure = useCallback(async () => {
    if (!service || !available || inFlight.current) return;
    inFlight.current = true;
    setIsMeasuring(true);
    try {
      const next = await service.measure({ roomId, profileId });
      if (!mounted.current) return;
      setSnapshot(next);

      // A recorded fact, not a correction: the room learns this client's
      // offset, and nothing downstream acts on it in this sprint.
      if (profileId && next.offset) {
        await service
          .publishOffset(
            { roomId, profileId },
            { correlationId: crypto.randomUUID(), actorProfileId: profileId },
          )
          .catch((cause: unknown) => {
            logger.warn("Clock offset publish failed", { module: MODULE, roomId, error: cause });
          });
      }
    } catch (cause) {
      logger.warn("Clock sync measurement failed", { module: MODULE, roomId, error: cause });
    } finally {
      inFlight.current = false;
      if (mounted.current) setIsMeasuring(false);
    }
  }, [available, profileId, roomId, service]);

  // Burst on entry, then the lighter periodic refresh while the room is open.
  useEffect(() => {
    if (!available) return;
    void measure();
    const timer = setInterval(() => void measure(), SYNC_RUNTIME.REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [available, measure]);

  // Leaving the room forgets the window: an offset measured on one connection
  // says nothing about the next one.
  useEffect(() => {
    if (!service) return;
    return () => service.forget(roomId);
  }, [roomId, service]);

  // Accessibility: Sprint 2.6 moves the spoken update to the room-level hook,
  // so this device's own band changes are no longer announced twice. The
  // measurement remains visible in the diagnostics card.
  const health = snapshot?.health ?? "unknown";

  return {
    snapshot,
    health,
    isSatisfactory: isHealthSatisfactory(health),
    needsResync: requiresResync(health),
    isMeasuring,
    isAvailable: available,
    remeasure: () => void measure(),
  };
}
