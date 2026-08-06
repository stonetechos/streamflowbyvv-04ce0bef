/**
 * Watch sync service — Sprint H1.
 *
 * The host-authoritative playback contract. Exactly one row per room holds
 * what the group is doing (`room_state`); the host's intents become versioned
 * writes, and every other client reconciles its own player toward the
 * projection of that row. Nothing here touches a player, and nothing here
 * claims synchronization it has not measured.
 */
import { createServiceToken } from "@/domain/service-registry";
import {
  authorizeCommand,
  type CommandContext,
  type CommandRejection,
  type RoomCommand,
} from "./room-runtime";
import type { RoomState } from "@/domain/rooms/room.types";
import type { PlaybackStatus } from "@/domain/shared/domain-enums";
import {
  ROOM_STATE_REPOSITORY,
  ROOM_STATE_WATCHER,
  isRepositoryBound,
  resolveRepository,
  type EntityId,
  type RoomStateRepository,
  type RoomStateWatcher,
} from "@/repository";

/** Playback phases the theater surface reports to humans. */
export type WatchPhase = "idle" | "playing" | "paused" | "buffering" | "ended";

/** How well this device matches the room. Never asserted without a measurement. */
export type WatchVerdict = "synced" | "catching_up" | "recovering" | "unknown";

export interface WatchState {
  readonly roomId: EntityId;
  readonly phase: WatchPhase;
  readonly positionMs: number;
  readonly rate: number;
  /** Server instant the position was true at. Null means "not anchored". */
  readonly anchorAt: string | null;
  readonly version: number;
  readonly lastActorProfileId: string | null;
  readonly updatedAt: string;
}

export type WatchIntent =
  | { readonly kind: "play"; readonly positionMs: number }
  | { readonly kind: "pause"; readonly positionMs: number }
  | { readonly kind: "seek"; readonly positionMs: number; readonly playing: boolean }
  | { readonly kind: "ended"; readonly positionMs: number };

/** Below this, the device is in sync and nothing is corrected. */
export const DRIFT_SYNCED_MS = 400;
/** Between synced and hard, the player is nudged with a rate change. */
export const DRIFT_HARD_MS = 2_000;

const MAX_WRITE_ATTEMPTS = 3;

/** Result of a state-changing command sent to the room authority. */
export type CommandOutcome =
  | { readonly outcome: "applied"; readonly state: WatchState }
  | { readonly outcome: "rejected"; readonly reason: CommandRejection };

export interface WatchSyncService {
  isAvailable(): boolean;
  read(roomId: EntityId): Promise<WatchState | null>;
  /** Reads, creating the room's state row when the host arrives first. */
  ensure(roomId: EntityId, actorProfileId: string | null): Promise<WatchState | null>;
  /** Host-only in practice: storage rejects a non-controller write. */
  publish(roomId: EntityId, intent: WatchIntent, actorProfileId: string): Promise<WatchState>;
  /**
   * Sprint H5 — the single entry point for a state-changing playback command.
   * Permissions are validated, the revision is checked, and only then does the
   * write happen; the caller is always told which of the two occurred.
   */
  dispatch(
    roomId: EntityId,
    command: RoomCommand,
    actorProfileId: string | null,
    context: Omit<CommandContext, "currentRevision"> & { readonly currentRevision?: number },
  ): Promise<CommandOutcome>;
  /** Marks the room as manually coordinated; claims no playback control. */
  markManualSync(roomId: EntityId, actorProfileId: string): Promise<WatchState | null>;
  /** Where the room should be right now, given a synchronized clock. */
  projectPositionMs(state: WatchState, nowEpochMs: number): number;
  classify(driftMs: number | null): WatchVerdict;
  subscribe(roomId: EntityId, listener: () => void): Promise<() => void>;
}

export interface WatchSyncDependencies {
  readonly states: RoomStateRepository | null;
  readonly watcher: RoomStateWatcher | null;
}

export function resolveWatchSyncDependencies(): WatchSyncDependencies {
  return {
    states: isRepositoryBound(ROOM_STATE_REPOSITORY)
      ? resolveRepository(ROOM_STATE_REPOSITORY)
      : null,
    watcher: isRepositoryBound(ROOM_STATE_WATCHER) ? resolveRepository(ROOM_STATE_WATCHER) : null,
  };
}

function toPhase(status: PlaybackStatus): WatchPhase {
  switch (status) {
    case "playing":
      return "playing";
    case "paused":
      return "paused";
    case "buffering":
      return "buffering";
    case "ended":
      return "ended";
    default:
      return "idle";
  }
}

function toWatchState(state: RoomState): WatchState {
  return {
    roomId: state.roomId,
    phase: toPhase(state.playbackStatus),
    positionMs: Math.max(0, state.positionMs),
    rate: state.playbackRate > 0 ? state.playbackRate : 1,
    anchorAt: state.anchorServerTime,
    version: state.version,
    lastActorProfileId: state.lastActorProfileId,
    updatedAt: state.updatedAt,
  };
}

function intentToPatch(intent: WatchIntent, actorProfileId: string) {
  const anchor = new Date().toISOString();
  const positionMs = Math.max(0, Math.round(intent.positionMs));
  const status: PlaybackStatus =
    intent.kind === "play"
      ? "playing"
      : intent.kind === "pause"
        ? "paused"
        : intent.kind === "ended"
          ? "ended"
          : intent.playing
            ? "playing"
            : "paused";

  return {
    playbackStatus: status,
    positionMs,
    anchorServerTime: anchor,
    lastActorProfileId: actorProfileId,
    syncMode: "controlled" as const,
  };
}

export function createWatchSyncService(deps: WatchSyncDependencies): WatchSyncService {
  const { states, watcher } = deps;

  const service: WatchSyncService = {
    isAvailable: () => states !== null,

    async read(roomId) {
      if (!states) return null;
      const row = await states.findByRoomId(roomId);
      return row ? toWatchState(row) : null;
    },

    async ensure(roomId, actorProfileId) {
      if (!states) return null;
      const existing = await states.findByRoomId(roomId);
      if (existing) return toWatchState(existing);
      const created = await states.create({
        roomId,
        playbackStatus: "idle",
        syncMode: "controlled",
        positionMs: 0,
        playbackRate: 1,
        lastActorProfileId: actorProfileId,
      });
      return toWatchState(created);
    },

    async publish(roomId, intent, actorProfileId) {
      if (!states) throw new Error("SF-SYS-PERSISTENCE-UNAVAILABLE");

      for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
        const current =
          (await states.findByRoomId(roomId)) ??
          (await states.create({
            roomId,
            playbackStatus: "idle",
            syncMode: "controlled",
            positionMs: 0,
            playbackRate: 1,
            lastActorProfileId: actorProfileId,
          }));

        const result = await states.tryUpdate(
          roomId,
          current.version,
          intentToPatch(intent, actorProfileId),
        );
        if (result.outcome === "applied") return toWatchState(result.state);
      }

      throw new Error("SF-SYS-CONFLICT");
    },

    async dispatch(roomId, command, actorProfileId, context) {
      if (!states) return { outcome: "rejected", reason: "unavailable" };
      if (!actorProfileId) return { outcome: "rejected", reason: "not-host" };

      const current = await states.findByRoomId(roomId);
      const currentRevision = context.currentRevision ?? current?.version ?? 0;
      const verdict = authorizeCommand(command, { ...context, currentRevision });
      if (!verdict.allowed) return { outcome: "rejected", reason: verdict.reason };

      // Countdown lifecycle is owned by the countdown runtime, which is already
      // server-timed and durable; the playback row only mirrors its status.
      if (command.kind === "start-countdown" || command.kind === "finish-countdown") {
        const base =
          current ??
          (await states.create({
            roomId,
            playbackStatus: "idle",
            syncMode: "controlled",
            positionMs: 0,
            playbackRate: 1,
            lastActorProfileId: actorProfileId,
          }));
        const result = await states.tryUpdate(roomId, base.version, {
          playbackStatus: command.kind === "start-countdown" ? "counting_down" : "ready",
          lastActorProfileId: actorProfileId,
        });
        return result.outcome === "applied"
          ? { outcome: "applied", state: toWatchState(result.state) }
          : { outcome: "rejected", reason: "stale-revision" };
      }

      const intent: WatchIntent =
        command.kind === "play"
          ? { kind: "play", positionMs: Math.round(command.positionSeconds * 1000) }
          : command.kind === "pause"
            ? { kind: "pause", positionMs: Math.round(command.positionSeconds * 1000) }
            : command.kind === "seek"
              ? {
                  kind: "seek",
                  positionMs: Math.round(command.positionSeconds * 1000),
                  playing: command.playing,
                }
              : { kind: "seek", positionMs: 0, playing: false };

      try {
        return { outcome: "applied", state: await service.publish(roomId, intent, actorProfileId) };
      } catch {
        return { outcome: "rejected", reason: "stale-revision" };
      }
    },

    async markManualSync(roomId, actorProfileId) {
      if (!states) return null;
      const current = await service.ensure(roomId, actorProfileId);
      if (!current) return null;
      const result = await states.tryUpdate(roomId, current.version, {
        syncMode: "manual",
        lastActorProfileId: actorProfileId,
      });
      return result.outcome === "applied" ? toWatchState(result.state) : current;
    },

    projectPositionMs(state, nowEpochMs) {
      if (state.phase !== "playing" || !state.anchorAt) return state.positionMs;
      const anchor = Date.parse(state.anchorAt);
      if (Number.isNaN(anchor)) return state.positionMs;
      const elapsed = Math.max(0, nowEpochMs - anchor);
      return state.positionMs + elapsed * state.rate;
    },

    classify(driftMs) {
      if (driftMs === null || !Number.isFinite(driftMs)) return "unknown";
      const magnitude = Math.abs(driftMs);
      if (magnitude <= DRIFT_SYNCED_MS) return "synced";
      if (magnitude <= DRIFT_HARD_MS) return "catching_up";
      return "recovering";
    },

    async subscribe(roomId, listener) {
      if (!watcher) return () => {};
      return watcher.subscribe(roomId, listener);
    },
  };

  return service;
}

export const WATCH_SYNC_SERVICE = createServiceToken<WatchSyncService>("WatchSyncService");
