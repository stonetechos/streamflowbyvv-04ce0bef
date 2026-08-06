/**
 * Watch sync hook — Sprint H1.
 *
 * Feature-layer half of host-authoritative playback. It measures and applies;
 * every rule (projection, drift bands, conflict retries) lives in the Domain
 * service. Host intents are written; guests reconcile and never write.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DRIFT_SYNCED_MS,
  WATCH_SYNC_SERVICE,
  isServiceBound,
  resolveService,
  type WatchIntent,
  type WatchState,
  type WatchVerdict,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "theater-watch-sync";
/** How often a guest compares its own player with the room. */
const RECONCILE_INTERVAL_MS = 1_000;
/** How often the host re-anchors while playing, so late joiners land close. */
const HOST_ANCHOR_INTERVAL_MS = 10_000;

export interface WatchSyncModel {
  readonly isAvailable: boolean;
  readonly state: WatchState | null;
  readonly verdict: WatchVerdict;
  readonly driftMs: number | null;
  readonly isLive: boolean;
  /** Where the room is right now, in media time. */
  targetPositionMs(): number | null;
  refresh(): void;
  play(positionMs: number): void;
  pause(positionMs: number): void;
  seek(positionMs: number, playing: boolean): void;
  markEnded(positionMs: number): void;
}

export interface UseWatchSyncInput {
  readonly roomId: string;
  readonly profileId: string | null;
  readonly isHost: boolean;
  readonly enabled: boolean;
  /** Estimated offset between this device's clock and the server's. */
  readonly clockOffsetMs: number;
  /** Reads the local player's position, or null when there is no player. */
  readLocalPositionMs(): number | null;
  /** Applies the room's decision to the local player. */
  applyRemote(command: {
    readonly phase: WatchState["phase"];
    readonly positionMs: number;
    readonly hardSeek: boolean;
  }): void;
}

export function useWatchSync({
  roomId,
  profileId,
  isHost,
  enabled,
  clockOffsetMs,
  readLocalPositionMs,
  applyRemote,
}: UseWatchSyncInput): WatchSyncModel {
  const service = useMemo(
    () => (isServiceBound(WATCH_SYNC_SERVICE) ? resolveService(WATCH_SYNC_SERVICE) : null),
    [],
  );
  const isAvailable = service?.isAvailable() ?? false;

  const [state, setState] = useState<WatchState | null>(null);
  const [driftMs, setDriftMs] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);

  const stateRef = useRef<WatchState | null>(null);
  stateRef.current = state;
  const readLocal = useRef(readLocalPositionMs);
  readLocal.current = readLocalPositionMs;
  const apply = useRef(applyRemote);
  apply.current = applyRemote;

  const serverNow = useCallback(() => Date.now() + clockOffsetMs, [clockOffsetMs]);

  const refresh = useCallback(() => {
    if (!service || !enabled) return;
    void service
      .ensure(roomId, profileId)
      .then((next) => setState(next))
      .catch((error: unknown) => {
        logger.warn("state_read_failed", { module: MODULE, roomId, error: String(error) });
      });
  }, [service, enabled, roomId, profileId]);

  // Initial read, plus a live notice whenever the authoritative row moves.
  useEffect(() => {
    if (!service || !enabled) return;
    let detach: (() => void) | null = null;
    let cancelled = false;

    refresh();
    void service
      .subscribe(roomId, () => refresh())
      .then((unsubscribe) => {
        if (cancelled) {
          unsubscribe();
          return;
        }
        detach = unsubscribe;
        setIsLive(true);
      })
      .catch(() => setIsLive(false));

    return () => {
      cancelled = true;
      detach?.();
      setIsLive(false);
    };
  }, [service, enabled, roomId, refresh]);

  // Guests reconcile toward the room; the host is the reference and does not.
  useEffect(() => {
    if (!service || !enabled || isHost) return;
    const timer = window.setInterval(() => {
      const current = stateRef.current;
      if (!current) return;
      const local = readLocal.current();
      const target = service.projectPositionMs(current, serverNow());

      if (local === null) {
        apply.current({ phase: current.phase, positionMs: target, hardSeek: true });
        setDriftMs(null);
        return;
      }

      const delta = local - target;
      setDriftMs(delta);
      const verdict = service.classify(delta);
      apply.current({
        phase: current.phase,
        positionMs: target,
        hardSeek: verdict === "recovering",
      });
    }, RECONCILE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [service, enabled, isHost, serverNow]);

  // The host re-anchors periodically so a late joiner never inherits stale math.
  useEffect(() => {
    if (!service || !enabled || !isHost || !profileId) return;
    const timer = window.setInterval(() => {
      const current = stateRef.current;
      const local = readLocal.current();
      if (!current || current.phase !== "playing" || local === null) return;
      void service
        .publish(roomId, { kind: "seek", positionMs: local, playing: true }, profileId)
        .then(setState)
        .catch(() => undefined);
    }, HOST_ANCHOR_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [service, enabled, isHost, profileId, roomId]);

  const publish = useCallback(
    (intent: WatchIntent) => {
      if (!service || !profileId || !isHost) return;
      void service
        .publish(roomId, intent, profileId)
        .then(setState)
        .catch((error: unknown) => {
          logger.warn("publish_failed", { module: MODULE, roomId, error: String(error) });
        });
    },
    [service, profileId, isHost, roomId],
  );

  return {
    isAvailable,
    state,
    verdict: service?.classify(isHost ? 0 : driftMs) ?? "unknown",
    driftMs: isHost ? 0 : driftMs,
    isLive,
    targetPositionMs: () =>
      service && state ? Math.round(service.projectPositionMs(state, serverNow())) : null,
    refresh,
    play: (positionMs) => publish({ kind: "play", positionMs }),
    pause: (positionMs) => publish({ kind: "pause", positionMs }),
    seek: (positionMs, playing) => publish({ kind: "seek", positionMs, playing }),
    markEnded: (positionMs) => publish({ kind: "ended", positionMs }),
  };
}

export { DRIFT_SYNCED_MS };
