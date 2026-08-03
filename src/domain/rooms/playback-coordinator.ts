/**
 * PlaybackCoordinator — Sprint 2.4.
 *
 * Host-authoritative orchestration of playback *intent*. It decides what
 * playback should do and announces it; it never does it. There is no provider
 * SDK here, no embedded player, no browser control, no deep-link launch, and
 * no credential of any kind — StreamFlow coordinates people, and each
 * participant presses play in their own app (MVP §6, ADR-003).
 *
 * Division of responsibility:
 *  - the state machine (`playback-machine`) decides what may follow what;
 *  - the runtime projection (`playback-runtime`) derives position purely;
 *  - `PlaybackService` (Sprint 1.6) publishes the catalog events;
 *  - this coordinator loads the room, authorises the actor, persists the
 *    runtime, and sequences the two.
 *
 * Event Bus usage — existing catalog names only, no new event infrastructure:
 *  - arm    -> `PlaybackSessionStarted` (a session exists; nothing is playing)
 *  - play   -> `PlaybackStarted`
 *  - pause  -> `PlaybackPaused`
 *  - resume -> `PlaybackResumed`
 *  - seek   -> `PlaybackSeeked` (refused in manual-sync rooms, ADR-003)
 *  - stop   -> `PlaybackEnded`
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { Clock } from "@/domain/events/event.types";
import {
  createPlaybackIntent,
  nextPlaybackState,
  projectPlayback,
  readPlaybackRuntime,
  writePlaybackRuntime,
  type PlaybackAction,
  type PlaybackIntent,
  type PlaybackMachineState,
  type PlaybackRuntime,
  type PlaybackSnapshot,
} from "@/domain/playback";
import { createServiceToken } from "@/domain/service-registry";
import type { PlaybackService } from "@/domain/services/playback-service";
import type { Intent } from "@/domain/services/service-context";
import type { SessionEndReason, SyncMode } from "@/domain/shared/domain-enums";
import {
  ROOM_REPOSITORY,
  isRepositoryBound,
  resolveRepository,
  type EntityId,
  type RoomRepository,
} from "@/repository";

import type { Room } from "./room.types";

export interface PlaybackArmRequest {
  readonly roomId: EntityId;
  readonly actorProfileId: EntityId;
  /** Defaults to manual: the MVP coordinates humans, not players (ADR-003). */
  readonly syncMode?: SyncMode;
  /** Optional known media length, purely for progress display. */
  readonly durationMs?: number | null;
}

export interface PlaybackPositionRequest {
  readonly roomId: EntityId;
  readonly actorProfileId: EntityId;
  readonly positionMs?: number;
}

export interface PlaybackSeekRequest extends PlaybackPositionRequest {
  readonly toPositionMs: number;
}

export interface PlaybackStopRequest extends PlaybackPositionRequest {
  readonly endReason?: SessionEndReason;
}

/** The result of any coordinator command: the new runtime and the intent. */
export interface PlaybackCommandResult {
  readonly runtime: PlaybackRuntime;
  readonly intent: PlaybackIntent | null;
}

export interface PlaybackCoordinator {
  /** False when no room store is bound; callers degrade, never crash. */
  isAvailable(): boolean;
  read(roomId: EntityId): Promise<PlaybackRuntime>;
  /** Pure projection so Presentation never holds a timing rule. */
  project(runtime: PlaybackRuntime, now?: Date): PlaybackSnapshot;
  /**
   * Post-countdown transition: the room becomes *ready*. Nothing launches,
   * nothing is contacted; participants simply become ready together.
   */
  arm(request: PlaybackArmRequest, intent: Intent): Promise<PlaybackCommandResult>;
  play(request: PlaybackPositionRequest, intent: Intent): Promise<PlaybackCommandResult>;
  pause(request: PlaybackPositionRequest, intent: Intent): Promise<PlaybackCommandResult>;
  resume(request: PlaybackPositionRequest, intent: Intent): Promise<PlaybackCommandResult>;
  seek(request: PlaybackSeekRequest, intent: Intent): Promise<PlaybackCommandResult>;
  stop(request: PlaybackStopRequest, intent: Intent): Promise<PlaybackCommandResult>;
  /** Hands playback authority to another member of the room. */
  transferOwnership(
    request: { roomId: EntityId; actorProfileId: EntityId; toProfileId: EntityId },
    intent: Intent,
  ): Promise<PlaybackRuntime>;
  /** True when this profile may issue intents for the room. */
  isOwner(runtime: PlaybackRuntime, profileId: string | null): boolean;
}

export interface PlaybackCoordinatorDependencies {
  readonly rooms: RoomRepository | null;
  readonly playback: PlaybackService;
  readonly clock: Clock;
  /** Injected so the Domain never depends on a specific id generator. */
  readonly newId: () => string;
}

function requireRooms(rooms: RoomRepository | null, operation: string): RoomRepository {
  if (!rooms) {
    throw domainError("SERVICE_UNAVAILABLE", { operation: `PlaybackCoordinator.${operation}` });
  }
  return rooms;
}

export function createPlaybackCoordinator(
  deps: PlaybackCoordinatorDependencies,
): PlaybackCoordinator {
  const { rooms, playback, clock, newId } = deps;

  const runtimeOf = (room: Room): PlaybackRuntime =>
    readPlaybackRuntime(room.id, room.metadata, room.providerId);

  /**
   * Loads the room and asserts the actor holds playback authority. Until a
   * session exists the host is the authority; afterwards it is whoever the
   * runtime names, so an explicit transfer survives a reload.
   */
  const loadAsOwner = async (
    operation: string,
    roomId: EntityId,
    actorProfileId: EntityId,
  ): Promise<{ room: Room; runtime: PlaybackRuntime }> => {
    const store = requireRooms(rooms, operation);
    const room = await store.findById(roomId);
    if (!room) {
      throw domainError("ROOM_NOT_FOUND", {
        operation: `PlaybackCoordinator.${operation}`,
        aggregateId: roomId,
      });
    }
    const runtime = runtimeOf(room);
    const owner = runtime.ownerProfileId ?? room.hostProfileId;
    if (owner !== actorProfileId) {
      throw domainError("ROOM_FORBIDDEN", {
        operation: `PlaybackCoordinator.${operation}`,
        aggregateId: roomId,
      });
    }
    return { room, runtime };
  };

  const advance = (
    from: PlaybackMachineState,
    action: PlaybackAction,
    operation: string,
    roomId: EntityId,
  ): PlaybackMachineState => {
    const next = nextPlaybackState(from, action);
    if (next === null) {
      throw domainError("ROOM_INVALID_TRANSITION", {
        operation: `PlaybackCoordinator.${operation}:${from}->${action}`,
        aggregateId: roomId,
      });
    }
    return next;
  };

  const persist = async (room: Room, runtime: PlaybackRuntime): Promise<PlaybackRuntime> => {
    const store = requireRooms(rooms, "persist");
    await store.update(room.id, {
      metadata: { ...room.metadata, ...writePlaybackRuntime(runtime) },
    });
    return runtime;
  };

  const intentOf = (
    kind: PlaybackIntent["kind"],
    request: PlaybackPositionRequest,
    intent: Intent,
    toPositionMs: number | null = null,
  ): PlaybackIntent =>
    createPlaybackIntent({
      kind,
      roomId: request.roomId,
      actorProfileId: request.actorProfileId,
      positionMs: request.positionMs ?? 0,
      toPositionMs,
      issuedAt: clock.now().toISOString(),
      correlationId: intent.correlationId,
    });

  const meta = (intent: Intent, actorProfileId: string): Intent => ({
    correlationId: intent.correlationId,
    causationId: intent.causationId,
    actorProfileId,
  });

  return {
    isAvailable: () => rooms !== null,

    isOwner: (runtime, profileId) =>
      profileId !== null && runtime.ownerProfileId !== null
        ? runtime.ownerProfileId === profileId
        : false,

    project: (runtime, now) => projectPlayback(runtime, now ?? clock.now()),

    async read(roomId) {
      const store = requireRooms(rooms, "read");
      const room = await store.findById(roomId);
      if (!room) {
        throw domainError("ROOM_NOT_FOUND", {
          operation: "PlaybackCoordinator.read",
          aggregateId: roomId,
        });
      }
      return runtimeOf(room);
    },

    async arm(request, intent) {
      const { room, runtime: current } = await loadAsOwner(
        "arm",
        request.roomId,
        request.actorProfileId,
      );
      // Already armed or beyond: arming twice is a no-op, not an error — a
      // second client reaching zero must not fail the room.
      if (current.state === "ready" || current.state === "playing") {
        return { runtime: current, intent: null };
      }

      const queued = advance(
        current.state === "queued" ? "idle" : current.state,
        "queue",
        "arm",
        room.id,
      );
      const state = advance(queued, "arm", "arm", room.id);

      const sessionId = current.sessionId ?? newId();
      const syncMode = request.syncMode ?? current.syncMode;
      const runtime: PlaybackRuntime = Object.freeze({
        ...current,
        state,
        sessionId,
        providerId: room.providerId,
        syncMode,
        ownerProfileId: current.ownerProfileId ?? room.hostProfileId,
        positionMs: 0,
        anchorAt: null,
        durationMs: request.durationMs ?? current.durationMs,
        startedAt: clock.now().toISOString(),
        endedAt: null,
        endReason: null,
        errorCode: null,
        revision: current.revision + 1,
      });

      const saved = await persist(room, runtime);

      // A session exists and everyone is ready. Nothing is playing: the name
      // is the frozen catalog's, and this sprint adds no new event.
      await playback.startSession(
        {
          playbackSessionId: sessionId,
          // Provisional, room-derived session code; durable code allocation
          // through `code_sequences` is Sprint 2.5 work.
          code: `${room.code}-P${runtime.revision}`,
          roomId: room.id,
          providerId: room.providerId ?? "",
          syncMode,
        },
        meta(intent, request.actorProfileId),
      );

      return { runtime: saved, intent: null };
    },

    async play(request, intent) {
      const { room, runtime: current } = await loadAsOwner(
        "play",
        request.roomId,
        request.actorProfileId,
      );
      const state = advance(current.state, "play", "play", room.id);
      const now = clock.now();
      const runtime: PlaybackRuntime = Object.freeze({
        ...current,
        state,
        positionMs: request.positionMs ?? current.positionMs,
        anchorAt: now.toISOString(),
        revision: current.revision + 1,
      });
      const saved = await persist(room, runtime);

      await playback.start(
        { roomId: room.id, positionMs: runtime.positionMs },
        meta(intent, request.actorProfileId),
      );

      return { runtime: saved, intent: intentOf("play", request, intent) };
    },

    async pause(request, intent) {
      const { room, runtime: current } = await loadAsOwner(
        "pause",
        request.roomId,
        request.actorProfileId,
      );
      const state = advance(current.state, "pause", "pause", room.id);
      const runtime: PlaybackRuntime = Object.freeze({
        ...current,
        state,
        positionMs: request.positionMs ?? current.positionMs,
        anchorAt: null,
        revision: current.revision + 1,
      });
      const saved = await persist(room, runtime);

      await playback.pause(
        {
          roomId: room.id,
          positionMs: runtime.positionMs,
          pausedByProfileId: request.actorProfileId,
        },
        meta(intent, request.actorProfileId),
      );

      return { runtime: saved, intent: intentOf("pause", request, intent) };
    },

    async resume(request, intent) {
      const { room, runtime: current } = await loadAsOwner(
        "resume",
        request.roomId,
        request.actorProfileId,
      );
      const action: PlaybackAction = current.state === "seeking" ? "settle" : "resume";
      const state = advance(current.state, action, "resume", room.id);
      const now = clock.now();
      const runtime: PlaybackRuntime = Object.freeze({
        ...current,
        state,
        positionMs: request.positionMs ?? current.positionMs,
        anchorAt: now.toISOString(),
        revision: current.revision + 1,
      });
      const saved = await persist(room, runtime);

      await playback.resume(
        { roomId: room.id, positionMs: runtime.positionMs },
        meta(intent, request.actorProfileId),
      );

      return { runtime: saved, intent: intentOf("resume", request, intent) };
    },

    async seek(request, intent) {
      const { room, runtime: current } = await loadAsOwner(
        "seek",
        request.roomId,
        request.actorProfileId,
      );
      const state = advance(current.state, "seek", "seek", room.id);
      const runtime: PlaybackRuntime = Object.freeze({
        ...current,
        state,
        positionMs: request.toPositionMs,
        anchorAt: null,
        revision: current.revision + 1,
      });

      // ADR-003 is enforced by the service before anything is written: a
      // manual-sync room has no remote control to seek with.
      await playback.seek(
        {
          roomId: room.id,
          fromPositionMs: request.positionMs ?? current.positionMs,
          toPositionMs: request.toPositionMs,
          actorProfileId: request.actorProfileId,
          syncMode: current.syncMode,
        },
        meta(intent, request.actorProfileId),
      );

      const saved = await persist(room, runtime);

      return {
        runtime: saved,
        intent: intentOf("seek", request, intent, request.toPositionMs),
      };
    },

    async stop(request, intent) {
      const { room, runtime: current } = await loadAsOwner(
        "stop",
        request.roomId,
        request.actorProfileId,
      );
      const state = advance(current.state, "complete", "stop", room.id);
      const endReason: SessionEndReason = request.endReason ?? "host_ended";
      const runtime: PlaybackRuntime = Object.freeze({
        ...current,
        state,
        positionMs: request.positionMs ?? current.positionMs,
        anchorAt: null,
        endedAt: clock.now().toISOString(),
        endReason,
        revision: current.revision + 1,
      });
      const saved = await persist(room, runtime);

      if (current.sessionId) {
        await playback.end(
          { playbackSessionId: current.sessionId, roomId: room.id, endReason },
          meta(intent, request.actorProfileId),
        );
      }

      return { runtime: saved, intent: intentOf("stop", request, intent) };
    },

    async transferOwnership(request) {
      const { room, runtime: current } = await loadAsOwner(
        "transferOwnership",
        request.roomId,
        request.actorProfileId,
      );
      const runtime: PlaybackRuntime = Object.freeze({
        ...current,
        ownerProfileId: request.toProfileId,
        revision: current.revision + 1,
      });
      return persist(room, runtime);
    },
  };
}

export function resolvePlaybackCoordinatorDependencies(input: {
  readonly playback: PlaybackService;
  readonly clock: Clock;
  readonly newId?: () => string;
}): PlaybackCoordinatorDependencies {
  return {
    rooms: isRepositoryBound(ROOM_REPOSITORY) ? resolveRepository(ROOM_REPOSITORY) : null,
    playback: input.playback,
    clock: input.clock,
    newId: input.newId ?? (() => crypto.randomUUID()),
  };
}

export const PLAYBACK_COORDINATOR =
  createServiceToken<PlaybackCoordinator>("PlaybackCoordinator");
