/**
 * Room runtime hook — Sprint H5.
 *
 * The feature-layer half of the control plane. It reads the authoritative
 * playback state, applies only newer revisions, projects the room position
 * against a clock-offset-corrected server time, and reconciles the local
 * player only when the active adapter is one the application actually drives.
 *
 * For a launch-only provider this hook issues no transport command, applies no
 * drift correction, and asserts nothing about anyone's device (ADR-014).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  WATCH_SYNC_SERVICE,
  classifyDriftCorrection,
  emptyPlaybackState,
  isFreshRevision,
  projectPositionSeconds,
  resolveDriftPolicy,
  syncStatusFor,
  toPlaybackState,
  isServiceBound,
  resolveService,
  type CommandRejection,
  type DriftCorrection,
  type DriftPolicy,
  type PlaybackState,
  type RoomCommand,
  type SyncStatusLabel,
  type WatchProviderCapability,
} from "@/domain";
import { logger } from "@/foundation/logging";

import { createRuntimeTelemetry, type RuntimeMetrics } from "./runtime-telemetry";

const MODULE = "theater-runtime";
const RECONCILE_INTERVAL_MS = 1_000;
const HOST_ANCHOR_INTERVAL_MS = 10_000;

export interface RoomRuntimeModel {
  readonly isAvailable: boolean;
  readonly playback: PlaybackState;
  readonly policy: DriftPolicy | null;
  /** True only when the app itself drives the media plane. */
  readonly isAutomatic: boolean;
  readonly driftMs: number | null;
  readonly correction: DriftCorrection;
  readonly syncStatus: SyncStatusLabel;
  readonly isLive: boolean;
  readonly lastRejection: CommandRejection | null;
  readonly metrics: RuntimeMetrics;
  /** Room position right now, in media seconds. */
  positionSeconds(): number;
  refresh(): void;
  send(command: RoomCommand): void;
}

export interface UseRoomRuntimeInput {
  readonly roomId: string;
  readonly profileId: string | null;
  readonly isHost: boolean;
  readonly enabled: boolean;
  readonly capability: WatchProviderCapability;
  readonly hasMedia: boolean;
  readonly mediaValid: boolean;
  readonly roomClosed: boolean;
  readonly isCountingDown: boolean;
  /** Estimated offset between this device's clock and the server's. */
  readonly clockOffsetMs: number;
  readLocalPositionSeconds(): number | null;
  readonly isBuffering: boolean;
  applyRemote(command: {
    readonly status: PlaybackState["status"];
    readonly positionSeconds: number;
    readonly correction: DriftCorrection;
    readonly rate: number;
  }): void;
}

export function useRoomRuntime(input: UseRoomRuntimeInput): RoomRuntimeModel {
  const {
    roomId,
    profileId,
    isHost,
    enabled,
    capability,
    hasMedia,
    mediaValid,
    roomClosed,
    isCountingDown,
    clockOffsetMs,
    readLocalPositionSeconds,
    isBuffering,
    applyRemote,
  } = input;

  const service = useMemo(
    () => (isServiceBound(WATCH_SYNC_SERVICE) ? resolveService(WATCH_SYNC_SERVICE) : null),
    [],
  );
  const isAvailable = service?.isAvailable() ?? false;
  const policy = useMemo(() => resolveDriftPolicy(capability), [capability]);
  const isAutomatic = policy !== null;

  const telemetry = useMemo(() => createRuntimeTelemetry(roomId), [roomId]);
  const [metrics, setMetrics] = useState<RuntimeMetrics>(() => telemetry.snapshot());
  const [playback, setPlayback] = useState<PlaybackState>(() => emptyPlaybackState(Date.now()));
  const [driftMs, setDriftMs] = useState<number | null>(null);
  const [correction, setCorrection] = useState<DriftCorrection>("none");
  const [isLive, setIsLive] = useState(false);
  const [lastRejection, setLastRejection] = useState<CommandRejection | null>(null);

  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const readLocal = useRef(readLocalPositionSeconds);
  readLocal.current = readLocalPositionSeconds;
  const apply = useRef(applyRemote);
  apply.current = applyRemote;
  const lastSeekAtRef = useRef<number | null>(null);
  const bufferingRef = useRef(isBuffering);
  bufferingRef.current = isBuffering;

  const serverNow = useCallback(() => Date.now() + clockOffsetMs, [clockOffsetMs]);

  /** Only a strictly newer revision is applied; anything else is a stale drop. */
  const accept = useCallback(
    (next: PlaybackState) => {
      setPlayback((current) => {
        if (current.revision >= 0 && !isFreshRevision(current.revision, next.revision)) {
          telemetry.count("revision.stale.rejected");
          return current;
        }
        return next;
      });
    },
    [telemetry],
  );

  const refresh = useCallback(() => {
    if (!service || !enabled) return;
    void service
      .ensure(roomId, profileId)
      .then((state) => {
        if (!state) return;
        accept(
          toPlaybackState(state, { isCountingDown, controlMode: capability.playbackControlMode }),
        );
      })
      .catch((error: unknown) => {
        logger.warn("state_read_failed", { module: MODULE, roomId, error: String(error) });
      });
  }, [service, enabled, roomId, profileId, accept, isCountingDown, capability.playbackControlMode]);

  // Snapshot on entry, then re-read on every realtime notice: a notice means
  // "re-read", never "trust this payload".
  useEffect(() => {
    if (!service || !enabled) return;
    let detach: (() => void) | null = null;
    let cancelled = false;

    refresh();
    telemetry.markReconnectStart();

    void service
      .subscribe(roomId, () => refresh())
      .then((unsubscribe) => {
        if (cancelled) {
          unsubscribe();
          return;
        }
        detach = unsubscribe;
        setIsLive(true);
        telemetry.markReconnectRecovered();
        telemetry.count("reconnect.recovered");
      })
      .catch(() => setIsLive(false));

    return () => {
      cancelled = true;
      detach?.();
      setIsLive(false);
    };
  }, [service, enabled, roomId, refresh, telemetry]);

  // Guests reconcile toward the room. Launch-only providers never get here:
  // there is no player of ours to correct.
  useEffect(() => {
    if (!service || !enabled || !isAutomatic || isHost) return;
    const timer = window.setInterval(() => {
      const state = playbackRef.current;
      if (state.revision < 0) return;
      const target = projectPositionSeconds(state, serverNow());
      const local = readLocal.current();

      if (local === null) {
        apply.current({
          status: state.status,
          positionSeconds: target,
          correction: "hard",
          rate: 1,
        });
        setDriftMs(null);
        return;
      }

      const delta = (local - target) * 1000;
      const verdict = classifyDriftCorrection(delta, policy, {
        isBuffering: bufferingRef.current,
        msSinceSeek: lastSeekAtRef.current === null ? null : Date.now() - lastSeekAtRef.current,
      });

      setDriftMs(delta);
      setCorrection(verdict);
      telemetry.sampleDrift(delta);
      if (verdict === "soft" || verdict === "hard") telemetry.count("sync.correction");
      if (verdict === "hard") lastSeekAtRef.current = Date.now();

      apply.current({
        status: state.status,
        positionSeconds: target,
        correction: verdict,
        rate: verdict === "soft" && delta < 0 ? (policy?.softRate ?? 1) : 1,
      });
      setMetrics(telemetry.snapshot());
    }, RECONCILE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [service, enabled, isAutomatic, isHost, policy, serverNow, telemetry]);

  const send = useCallback(
    (command: RoomCommand) => {
      if (!service) {
        setLastRejection("unavailable");
        return;
      }
      if (command.kind === "seek" || command.kind === "restart") lastSeekAtRef.current = Date.now();

      void service
        .dispatch(roomId, command, profileId, {
          isHost,
          roomClosed,
          hasMedia,
          mediaValid,
          controlMode: capability.playbackControlMode,
          currentRevision: playbackRef.current.revision,
          expectedRevision: playbackRef.current.revision,
        })
        .then((result) => {
          if (result.outcome === "rejected") {
            setLastRejection(result.reason);
            if (result.reason === "stale-revision") telemetry.count("revision.stale.rejected");
            return;
          }
          setLastRejection(null);
          accept(
            toPlaybackState(result.state, {
              isCountingDown,
              controlMode: capability.playbackControlMode,
            }),
          );
        })
        .catch((error: unknown) => {
          logger.warn("command_failed", { module: MODULE, roomId, error: String(error) });
          setLastRejection("unavailable");
        });
    },
    [
      service,
      roomId,
      profileId,
      isHost,
      roomClosed,
      hasMedia,
      mediaValid,
      capability.playbackControlMode,
      accept,
      isCountingDown,
      telemetry,
    ],
  );

  // The host re-anchors while playing so a late joiner never inherits stale math.
  useEffect(() => {
    if (!service || !enabled || !isAutomatic || !isHost || !profileId) return;
    const timer = window.setInterval(() => {
      const state = playbackRef.current;
      const local = readLocal.current();
      if (state.status !== "playing" || local === null) return;
      send({ kind: "seek", positionSeconds: local, playing: true });
    }, HOST_ANCHOR_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [service, enabled, isAutomatic, isHost, profileId, send]);

  // The countdown is shared state, so the reported status must follow it even
  // when the durable row has not moved.
  const shownPlayback = useMemo<PlaybackState>(() => {
    if (isCountingDown) return { ...playback, status: "countdown" };
    if (!isAutomatic)
      return { ...playback, status: playback.status === "ended" ? "ended" : "manual-sync" };
    return playback;
  }, [playback, isCountingDown, isAutomatic]);

  return {
    isAvailable,
    playback: shownPlayback,
    policy,
    isAutomatic,
    driftMs: isHost && isAutomatic ? 0 : driftMs,
    correction: isAutomatic ? correction : "none",
    syncStatus: syncStatusFor(isHost && isAutomatic ? "none" : correction, policy),
    isLive,
    lastRejection,
    metrics,
    positionSeconds: () => projectPositionSeconds(shownPlayback, serverNow()),
    refresh,
    send,
  };
}
