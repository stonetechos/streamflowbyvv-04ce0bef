/**
 * Countdown coordinator — Sprint 2.3.
 *
 * Owns the countdown lifecycle for a room: host start, cancel, restart,
 * completion, and expiry. It is provider-agnostic by construction — it never
 * names a provider, never builds a deep link, never touches a player, and
 * never starts playback. Reaching zero is where this sprint stops.
 *
 * Division of responsibility:
 *  - the state machine (`countdown-machine`) decides what may follow what;
 *  - the runtime projection (`countdown-runtime`) derives remaining time purely;
 *  - this coordinator performs the writes and publishes the catalog events.
 *
 * Event Bus (Sprint 1.6) usage, no new event infrastructure:
 *  - start    -> `CountdownScheduled`
 *  - complete -> `CountdownFired`
 *  - cancel   -> `CountdownCancelled` (reason `host_cancelled` / `restart`)
 *  - expire   -> `CountdownCancelled` (reason `expired`)
 * Ticks are per-second UI signals, not durable facts: they are delivered to
 * local subscribers through `subscribeToTicks` and are deliberately NOT
 * persisted to `domain_events`. Ratifying `CountdownTick` / `CountdownExpired`
 * as catalog events would be a documentation change, which this sprint forbids.
 */
import {
  isCountdownLive,
  isCountdownPastGrace,
  nextCountdownState,
  projectCountdown,
  readCountdownRuntime,
  writeCountdownRuntime,
  type CountdownAction,
  type CountdownProjection,
  type CountdownRuntime,
  type CountdownRuntimeState,
} from "@/domain/countdown";
import { domainError } from "@/domain/errors/domain-errors";
import type { Clock } from "@/domain/events/event.types";
import type { EventPublisher } from "@/domain/events/event-bus";
import { createServiceToken } from "@/domain/service-registry";
import type { Intent } from "@/domain/services/service-context";
import {
  ROOM_REPOSITORY,
  isRepositoryBound,
  resolveRepository,
  type EntityId,
  type RoomRepository,
} from "@/repository";
import { COUNTDOWN, COUNTDOWN_RUNTIME } from "@/shared/constants/system-constants";

import { COUNTDOWN_SECONDS_METADATA_KEY } from "./room-setup-service";
import type { MetadataBag, Room } from "./room.types";

/** Machine-readable cancellation reasons. Presentation maps these to copy. */
export const COUNTDOWN_REASONS = Object.freeze({
  HOST_CANCELLED: "host_cancelled",
  RESTARTED: "restarted",
  EXPIRED: "expired",
});

export interface CountdownStartRequest {
  readonly roomId: EntityId;
  readonly actorProfileId: EntityId;
  /** Optional override; falls back to the room's stored length (Sprint 2.2). */
  readonly durationSeconds?: number;
}

export interface CountdownActorRequest {
  readonly roomId: EntityId;
  readonly actorProfileId: EntityId;
}

/** A per-second signal for local subscribers. Never persisted, never replayed. */
export interface CountdownTickSignal {
  readonly roomId: EntityId;
  readonly projection: CountdownProjection;
  readonly observedAt: string;
}

export type CountdownTickUnsubscribe = () => void;

export interface CountdownCoordinator {
  /** False when no room store is bound; callers degrade, never crash. */
  isAvailable(): boolean;
  /** Current durable runtime for a room. */
  read(roomId: EntityId): Promise<CountdownRuntime>;
  /** Host-only. Writes the shared instant and publishes `CountdownScheduled`. */
  start(request: CountdownStartRequest, intent: Intent): Promise<CountdownRuntime>;
  /** Host-only. Publishes `CountdownCancelled`. */
  cancel(request: CountdownActorRequest, intent: Intent): Promise<CountdownRuntime>;
  /** Host-only. Cancels with reason `restarted`, then starts a fresh countdown. */
  restart(request: CountdownStartRequest, intent: Intent): Promise<CountdownRuntime>;
  /**
   * Marks a countdown as reached. Host-only so exactly one client writes the
   * completion; participants observe it. Playback does NOT begin here.
   */
  complete(request: CountdownActorRequest, intent: Intent): Promise<CountdownRuntime>;
  /** Host-only. Retires a countdown nobody completed inside the grace window. */
  expire(request: CountdownActorRequest, intent: Intent): Promise<CountdownRuntime>;
  /** True when the stored runtime has outlived its grace window. */
  isPastGrace(runtime: CountdownRuntime, now?: Date): boolean;
  /** Pure projection helper so Presentation never reads a device clock rule. */
  project(runtime: CountdownRuntime, now?: Date): CountdownProjection;
  /** Local tick fan-out. Returns an unsubscribe. */
  subscribeToTicks(
    roomId: EntityId,
    listener: (signal: CountdownTickSignal) => void,
  ): CountdownTickUnsubscribe;
  /** Publishes a tick to local subscribers only. */
  emitTick(roomId: EntityId, projection: CountdownProjection): void;
}

export interface CountdownCoordinatorDependencies {
  readonly rooms: RoomRepository | null;
  readonly events: EventPublisher;
  readonly clock: Clock;
}

function requireRooms(rooms: RoomRepository | null, operation: string): RoomRepository {
  if (!rooms) {
    throw domainError("SERVICE_UNAVAILABLE", {
      operation: `CountdownCoordinator.${operation}`,
    });
  }
  return rooms;
}

function storedSeconds(metadata: MetadataBag): number {
  const raw = metadata[COUNTDOWN_SECONDS_METADATA_KEY];
  return typeof raw === "number" ? raw : COUNTDOWN.DEFAULT_SECONDS;
}

export function createCountdownCoordinator(
  deps: CountdownCoordinatorDependencies,
): CountdownCoordinator {
  const { rooms, events, clock } = deps;
  const listeners = new Map<string, Set<(signal: CountdownTickSignal) => void>>();

  /** Loads the room and asserts the actor is its host. */
  const loadAsHost = async (
    operation: string,
    roomId: EntityId,
    actorProfileId: EntityId,
  ): Promise<Room> => {
    const store = requireRooms(rooms, operation);
    const room = await store.findById(roomId);
    if (!room) {
      throw domainError("ROOM_NOT_FOUND", {
        operation: `CountdownCoordinator.${operation}`,
        aggregateId: roomId,
      });
    }
    if (room.hostProfileId !== actorProfileId) {
      // Only the host drives the shared clock — MVP §6, one authority per room.
      throw domainError("ROOM_FORBIDDEN", {
        operation: `CountdownCoordinator.${operation}`,
        aggregateId: roomId,
      });
    }
    return room;
  };

  const runtimeOf = (room: Room): CountdownRuntime =>
    readCountdownRuntime(room.id, room.metadata, storedSeconds(room.metadata));

  const advance = (
    current: CountdownRuntimeState,
    action: CountdownAction,
    operation: string,
    roomId: EntityId,
  ): CountdownRuntimeState => {
    const next = nextCountdownState(current, action);
    if (next === null) {
      throw domainError("ROOM_INVALID_TRANSITION", {
        operation: `CountdownCoordinator.${operation}:${current}->${action}`,
        aggregateId: roomId,
      });
    }
    return next;
  };

  const persist = async (room: Room, runtime: CountdownRuntime): Promise<CountdownRuntime> => {
    const store = requireRooms(rooms, "persist");
    await store.update(room.id, {
      metadata: { ...room.metadata, ...writeCountdownRuntime(runtime) },
    });
    return runtime;
  };

  const cancelWith = async (
    request: CountdownActorRequest,
    intent: Intent,
    reason: string,
    operation: string,
  ): Promise<CountdownRuntime> => {
    const room = await loadAsHost(operation, request.roomId, request.actorProfileId);
    const current = runtimeOf(room);
    const state = advance(current.state, "cancel", operation, request.roomId);

    const runtime: CountdownRuntime = Object.freeze({
      ...current,
      state,
      targetAt: null,
      reason,
      revision: current.revision + 1,
    });
    const saved = await persist(room, runtime);

    await events.publish(
      "CountdownCancelled",
      room.id,
      {
        roomId: room.id,
        cancelledByProfileId: request.actorProfileId,
        reason,
      },
      { correlationId: intent.correlationId, actorProfileId: request.actorProfileId },
    );

    return saved;
  };

  const startFrom = async (
    room: Room,
    request: CountdownStartRequest,
    intent: Intent,
    fromState: CountdownRuntimeState,
    operation: string,
  ): Promise<CountdownRuntime> => {
    // Two-step by design: `preparing` is a real state, so a slow write is
    // visible to participants instead of appearing as a stalled countdown.
    const preparing = advance(fromState, "prepare", operation, room.id);
    const state = advance(preparing, "start", operation, room.id);

    const current = runtimeOf(room);
    const seconds = normalizeSeconds(request.durationSeconds ?? storedSeconds(room.metadata));
    const now = clock.now();
    const runtime: CountdownRuntime = Object.freeze({
      roomId: room.id,
      state,
      durationSeconds: seconds,
      startedAt: now.toISOString(),
      targetAt: new Date(now.getTime() + seconds * 1_000).toISOString(),
      requestedByProfileId: request.actorProfileId,
      reason: null,
      revision: current.revision + 1,
    });

    const saved = await persist(room, runtime);

    await events.publish(
      "CountdownScheduled",
      room.id,
      {
        roomId: room.id,
        countdownTargetAt: runtime.targetAt as string,
        durationSeconds: seconds,
        scheduledByProfileId: request.actorProfileId,
      },
      { correlationId: intent.correlationId, actorProfileId: request.actorProfileId },
    );

    return saved;
  };

  return {
    isAvailable: () => rooms !== null,

    async read(roomId) {
      const store = requireRooms(rooms, "read");
      const room = await store.findById(roomId);
      if (!room) {
        throw domainError("ROOM_NOT_FOUND", {
          operation: "CountdownCoordinator.read",
          aggregateId: roomId,
        });
      }
      return runtimeOf(room);
    },

    async start(request, intent) {
      const room = await loadAsHost("start", request.roomId, request.actorProfileId);
      const current = runtimeOf(room);
      if (isCountdownLive(current.state)) {
        // Idempotent from the caller's point of view: a second Start does not
        // move the shared instant out from under the participants.
        return current;
      }
      return startFrom(room, request, intent, current.state, "start");
    },

    cancel(request, intent) {
      return cancelWith(request, intent, COUNTDOWN_REASONS.HOST_CANCELLED, "cancel");
    },

    async restart(request, intent) {
      await cancelWith(
        { roomId: request.roomId, actorProfileId: request.actorProfileId },
        intent,
        COUNTDOWN_REASONS.RESTARTED,
        "restart",
      );
      const room = await loadAsHost("restart", request.roomId, request.actorProfileId);
      return startFrom(room, request, intent, "cancelled", "restart");
    },

    async complete(request, intent) {
      const room = await loadAsHost("complete", request.roomId, request.actorProfileId);
      const current = runtimeOf(room);
      if (current.state === "completed") return current;
      const state = advance(current.state, "complete", "complete", request.roomId);

      const firedAt = clock.now().toISOString();
      const runtime: CountdownRuntime = Object.freeze({
        ...current,
        state,
        reason: null,
        revision: current.revision + 1,
      });
      const saved = await persist(room, runtime);

      // Reaching zero is the end of this sprint's responsibility: no playback
      // session is opened, no provider is contacted (sprint scope).
      await events.publish(
        "CountdownFired",
        room.id,
        { roomId: room.id, firedAt },
        { correlationId: intent.correlationId, actorProfileId: request.actorProfileId },
      );

      return saved;
    },

    async expire(request, intent) {
      const room = await loadAsHost("expire", request.roomId, request.actorProfileId);
      const current = runtimeOf(room);
      if (current.state === "expired") return current;
      const state = advance(current.state, "expire", "expire", request.roomId);

      const runtime: CountdownRuntime = Object.freeze({
        ...current,
        state,
        targetAt: null,
        reason: COUNTDOWN_REASONS.EXPIRED,
        revision: current.revision + 1,
      });
      const saved = await persist(room, runtime);

      // No `CountdownExpired` name exists in the frozen catalog; expiry is
      // reported as a cancellation carrying the `expired` reason.
      await events.publish(
        "CountdownCancelled",
        room.id,
        {
          roomId: room.id,
          cancelledByProfileId: request.actorProfileId,
          reason: COUNTDOWN_REASONS.EXPIRED,
        },
        { correlationId: intent.correlationId, actorProfileId: request.actorProfileId },
      );

      return saved;
    },

    isPastGrace(runtime, now) {
      return isCountdownPastGrace(runtime, now ?? clock.now(), COUNTDOWN_RUNTIME.EXPIRY_GRACE_MS);
    },

    project(runtime, now) {
      return projectCountdown(runtime, now ?? clock.now());
    },

    subscribeToTicks(roomId, listener) {
      const set = listeners.get(roomId) ?? new Set<(signal: CountdownTickSignal) => void>();
      set.add(listener);
      listeners.set(roomId, set);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(roomId);
      };
    },

    emitTick(roomId, projection) {
      const set = listeners.get(roomId);
      if (!set || set.size === 0) return;
      const signal: CountdownTickSignal = Object.freeze({
        roomId,
        projection,
        observedAt: clock.now().toISOString(),
      });
      for (const listener of set) listener(signal);
    },
  };
}

/** Local clamp so the coordinator never widens the specified envelope. */
function normalizeSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return COUNTDOWN.DEFAULT_SECONDS;
  const whole = Math.round(seconds);
  if (whole < COUNTDOWN.MIN_SECONDS || whole > COUNTDOWN.MAX_SECONDS) {
    throw domainError("SYNC_COUNTDOWN_OUT_OF_RANGE", {
      operation: "CountdownCoordinator.start",
    });
  }
  return whole;
}

export function resolveCountdownCoordinatorDependencies(input: {
  readonly events: EventPublisher;
  readonly clock: Clock;
}): CountdownCoordinatorDependencies {
  return {
    rooms: isRepositoryBound(ROOM_REPOSITORY) ? resolveRepository(ROOM_REPOSITORY) : null,
    ...input,
  };
}

export const COUNTDOWN_COORDINATOR =
  createServiceToken<CountdownCoordinator>("CountdownCoordinator");
