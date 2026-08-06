/**
 * Room countdown hook — Sprint 2.3.
 *
 * The Feature-layer half of the countdown runtime: it schedules, it does not
 * decide. Every lifecycle rule (who may start, what may follow what, when a
 * countdown is abandoned) lives in `CountdownCoordinator`; this hook only
 *
 *  1. reads the durable runtime and re-reads it on a realtime notice,
 *  2. ticks a local interval and asks Domain to project the remaining time,
 *  3. lets the host complete or expire a countdown that reached its target,
 *  4. announces the final seconds through the shared accessibility announcer.
 *
 * Reaching zero starts nothing. No player is touched, no provider is contacted,
 * no synchronization is attempted — that is Sprint 2.4 and beyond.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  COUNTDOWN_COORDINATOR,
  isServiceBound,
  resolveService,
  type CountdownProjection,
  type CountdownRuntime,
  type CountdownRuntimeState,
} from "@/domain";
import { useAnnouncer } from "@/foundation/accessibility";
import { logger } from "@/foundation/logging";
import { useTranslation } from "@/foundation/localization";

import { useRoomRealtime } from "./use-room-realtime";
import { COUNTDOWN_RUNTIME } from "@/shared/constants/system-constants";

import { toWaitingRoomError } from "./waiting-room-state";
import type { WaitingRoomError } from "./waiting-room.types";

const MODULE = "waiting-room-countdown";

export type CountdownPendingAction = "start" | "cancel" | "restart" | null;

export interface RoomCountdownModel {
  readonly state: CountdownRuntimeState;
  readonly projection: CountdownProjection | null;
  readonly remainingSeconds: number;
  readonly elapsedRatio: number;
  readonly isLive: boolean;
  /** Profile that asked for this countdown, for "Started by …". */
  readonly requestedByProfileId: string | null;
  readonly reason: string | null;
  readonly durationSeconds: number;
  readonly pending: CountdownPendingAction;
  readonly error: WaitingRoomError | null;
  /**
   * WP6 (CERT-WP-01) — the instant *this* client observed the shared target
   * pass, as an ISO-8601 string, or null when this client has not reached zero
   * for the current countdown. It is an observation, never an authority: it is
   * derived from the same server-written target every peer reads, and nothing
   * in the lobby branches on it. Presentation surfaces it so the countdown
   * spread across participants can be measured from outside the app.
   */
  readonly reachedZeroAt: string | null;
  /** False when no countdown store is bound; controls render disabled. */
  readonly isAvailable: boolean;

  start(): void;
  cancel(): void;
  restart(): void;
  refresh(): void;
}

export interface UseRoomCountdownInput {
  readonly roomId: string;
  readonly actorProfileId: string | null;
  readonly isHost: boolean;
  readonly durationSeconds: number;
  readonly enabled: boolean;
  /**
   * Sprint 2.6 — the Foundation §15 gate, owned by `RoomSyncCoordinator`. It
   * throws when the room is in the Re-sync Required band. This hook calls it
   * and reports the refusal; it never decides eligibility itself.
   */
  readonly assertSyncEligible?: () => void;
}

const IDLE_STATE: CountdownRuntimeState = "idle";

export function useRoomCountdown({
  roomId,
  actorProfileId,
  isHost,
  durationSeconds,
  enabled,
  assertSyncEligible,
}: UseRoomCountdownInput): RoomCountdownModel {
  const { t } = useTranslation();
  const announce = useAnnouncer();

  const coordinator = useMemo(
    () => (isServiceBound(COUNTDOWN_COORDINATOR) ? resolveService(COUNTDOWN_COORDINATOR) : null),
    [],
  );

  const [runtime, setRuntime] = useState<CountdownRuntime | null>(null);
  const [projection, setProjection] = useState<CountdownProjection | null>(null);
  const [pending, setPending] = useState<CountdownPendingAction>(null);
  const [error, setError] = useState<WaitingRoomError | null>(null);
  // WP6 — one observation per countdown revision, so a restart re-arms it.
  const [reachedZeroAt, setReachedZeroAt] = useState<string | null>(null);

  const mounted = useRef(true);
  const lastAnnouncedSecond = useRef<number | null>(null);
  const lastAnnouncedState = useRef<CountdownRuntimeState | null>(null);
  const zeroRevision = useRef<number | null>(null);
  const settling = useRef(false);

  const available = coordinator !== null && coordinator.isAvailable() && enabled;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!coordinator || !available) return;
    try {
      const next = await coordinator.read(roomId);
      if (!mounted.current) return;
      setRuntime(next);
      setProjection(coordinator.project(next));
    } catch (cause) {
      if (!mounted.current) return;
      // A failed read dims the panel; it never breaks the lobby.
      logger.warn("Countdown read failed", { module: MODULE, roomId, error: cause });
    }
  }, [available, coordinator, roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Milestone D.5 — the room's single shared subscription, coalesced by the
  // hub. A notice still means "re-read", never "trust this payload".
  useRoomRealtime(roomId, available, () => {
    void load();
  });

  // The local ticker. It derives nothing itself: every value comes back from
  // the Domain projection against the server-written target instant.
  useEffect(() => {
    if (!coordinator || !available || !runtime) return;
    if (runtime.state !== "counting_down" && runtime.state !== "preparing") return;

    const tick = () => {
      const next = coordinator.project(runtime);
      setProjection(next);
      coordinator.emitTick(roomId, next);

      // WP6 (CERT-WP-01) — mark the local instant the shared target passed.
      // Every client derives this from the same server-written `targetAt`.
      if (next.hasReachedTarget && zeroRevision.current !== runtime.revision) {
        zeroRevision.current = runtime.revision;
        setReachedZeroAt(new Date().toISOString());
      }

      if (!isHost || !actorProfileId || settling.current) return;

      if (next.hasReachedTarget) {
        settling.current = true;
        void coordinator
          .complete(
            { roomId, actorProfileId },
            { correlationId: crypto.randomUUID(), actorProfileId },
          )
          .then(() => load())
          .catch((cause: unknown) =>
            logger.warn("Countdown completion failed", { module: MODULE, roomId, error: cause }),
          )
          .finally(() => {
            settling.current = false;
          });
        return;
      }

      if (coordinator.isPastGrace(runtime)) {
        settling.current = true;
        void coordinator
          .expire(
            { roomId, actorProfileId },
            { correlationId: crypto.randomUUID(), actorProfileId },
          )
          .then(() => load())
          .catch((cause: unknown) =>
            logger.warn("Countdown expiry failed", { module: MODULE, roomId, error: cause }),
          )
          .finally(() => {
            settling.current = false;
          });
      }
    };

    tick();
    const timer = window.setInterval(tick, COUNTDOWN_RUNTIME.TICK_INTERVAL_MS);

    // WP6 (CERT-WP-01) — the ticker's 250 ms grid is a display cadence, and it
    // was landing zero up to ~1.4 s apart across clients because each client's
    // grid has its own phase. The shared instant is known in advance, so every
    // client also arms one timer for exactly that instant. This changes when a
    // client notices zero, not who decides it: the target is still the single
    // server-written `targetAt` every peer reads.
    const msToTarget = coordinator.project(runtime).remainingMs;
    const zeroTimer =
      msToTarget > 0 ? window.setTimeout(tick, msToTarget + COUNTDOWN_RUNTIME.ZERO_SETTLE_MS) : null;

    return () => {
      window.clearInterval(timer);
      if (zeroTimer !== null) window.clearTimeout(zeroTimer);
    };
  }, [actorProfileId, available, coordinator, isHost, load, roomId, runtime]);


  // Announcements: state changes always, then the final seconds once each.
  useEffect(() => {
    if (!projection) return;

    if (lastAnnouncedState.current !== projection.state) {
      lastAnnouncedState.current = projection.state;
      lastAnnouncedSecond.current = null;
      const key = `room.countdown.announce.${projection.state}`;
      if (projection.state !== "idle") {
        announce(t(key), projection.state === "counting_down" ? "polite" : "assertive");
      }
    }

    if (projection.state !== "counting_down") return;
    const second = projection.remainingSeconds;
    if (second <= 0 || second > COUNTDOWN_RUNTIME.ANNOUNCE_FROM_SECONDS) return;
    if (lastAnnouncedSecond.current === second) return;
    lastAnnouncedSecond.current = second;
    announce(t("room.countdown.announce.tick", { seconds: String(second) }), "polite");
  }, [announce, projection, t]);

  const run = useCallback(
    async (action: Exclude<CountdownPendingAction, null>, operation: () => Promise<unknown>) => {
      setPending(action);
      setError(null);
      try {
        await operation();
        await load();
      } catch (cause) {
        if (!mounted.current) return;
        logger.warn("Countdown action failed", { module: MODULE, action, roomId, error: cause });
        setError(toWaitingRoomError(cause));
      } finally {
        if (mounted.current) setPending(null);
      }
    },
    [load, roomId],
  );

  const intent = useCallback(
    () => ({ correlationId: crypto.randomUUID(), actorProfileId: actorProfileId ?? "" }),
    [actorProfileId],
  );

  const start = useCallback(() => {
    if (!coordinator || !actorProfileId || !isHost) return;
    void run("start", async () => {
      // The gate runs inside the same action so a refusal surfaces exactly
      // like any other Domain error, with no local interpretation.
      assertSyncEligible?.();
      return coordinator.start({ roomId, actorProfileId, durationSeconds }, intent());
    });
  }, [
    actorProfileId,
    assertSyncEligible,
    coordinator,
    durationSeconds,
    intent,
    isHost,
    roomId,
    run,
  ]);

  const cancel = useCallback(() => {
    if (!coordinator || !actorProfileId || !isHost) return;
    void run("cancel", () => coordinator.cancel({ roomId, actorProfileId }, intent()));
  }, [actorProfileId, coordinator, intent, isHost, roomId, run]);

  const restart = useCallback(() => {
    if (!coordinator || !actorProfileId || !isHost) return;
    void run("restart", async () => {
      assertSyncEligible?.();
      return coordinator.restart({ roomId, actorProfileId, durationSeconds }, intent());
    });
  }, [
    actorProfileId,
    assertSyncEligible,
    coordinator,
    durationSeconds,
    intent,
    isHost,
    roomId,
    run,
  ]);

  return {
    state: runtime?.state ?? IDLE_STATE,
    projection,
    remainingSeconds: projection?.remainingSeconds ?? 0,
    elapsedRatio: projection?.elapsedRatio ?? 0,
    isLive: projection?.isLive ?? false,
    requestedByProfileId: runtime?.requestedByProfileId ?? null,
    reason: runtime?.reason ?? null,
    durationSeconds: runtime?.durationSeconds ?? durationSeconds,
    pending,
    error,
    reachedZeroAt,

    isAvailable: available,
    start,
    cancel,
    restart,
    refresh: () => void load(),
  };
}
