/**
 * Room governance service — Sprint H6.
 *
 * The one place a moderation act becomes durable. Every write is authorized
 * against the pure rules in `room-governance.ts` first, so an unauthorized
 * caller is refused in Domain rather than by a storage error.
 */
import { createServiceToken } from "@/domain/service-registry";
import {
  ROOM_MEMBER_REPOSITORY,
  ROOM_REPOSITORY,
  isRepositoryBound,
  resolveRepository,
  type EntityId,
  type RoomMemberRepository,
  type RoomRepository,
} from "@/repository";

import {
  canPerform,
  readGovernance,
  writeGovernance,
  type ModerationAction,
  type PermissionContext,
  type RoomGovernanceSettings,
} from "./room-governance";

export interface RoomGovernanceService {
  isAvailable(): boolean;
  /** Reads the room's current settings; defaults when the room is unreadable. */
  load(roomId: EntityId): Promise<RoomGovernanceSettings>;
  /** Applies a settings patch after authorizing `action` for the caller. */
  applySettings(input: {
    readonly roomId: EntityId;
    readonly action: ModerationAction;
    readonly context: PermissionContext;
    readonly patch: Partial<RoomGovernanceSettings>;
  }): Promise<RoomGovernanceSettings>;
  /** Host-only: end the room for everybody. */
  closeRoom(input: { readonly roomId: EntityId; readonly context: PermissionContext }): Promise<void>;
  /** Silences a participant in voice; their own device controls are unaffected. */
  setParticipantMuted(input: {
    readonly memberId: EntityId;
    readonly muted: boolean;
    readonly context: PermissionContext;
  }): Promise<void>;
  /** Removes a participant. The seat is released; the row is retained. */
  removeParticipant(input: {
    readonly memberId: EntityId;
    readonly context: PermissionContext;
  }): Promise<void>;
}

export interface RoomGovernanceDependencies {
  readonly rooms: RoomRepository | null;
  readonly members: RoomMemberRepository | null;
}

export function resolveRoomGovernanceDependencies(): RoomGovernanceDependencies {
  return {
    rooms: isRepositoryBound(ROOM_REPOSITORY) ? resolveRepository(ROOM_REPOSITORY) : null,
    members: isRepositoryBound(ROOM_MEMBER_REPOSITORY)
      ? resolveRepository(ROOM_MEMBER_REPOSITORY)
      : null,
  };
}

function authorize(action: ModerationAction, context: PermissionContext): void {
  if (!canPerform(action, context)) throw new Error("SF-ROOM-FORBIDDEN");
}

export function createRoomGovernanceService(
  deps: RoomGovernanceDependencies,
): RoomGovernanceService {
  const { rooms, members } = deps;

  return {
    isAvailable: () => rooms !== null && members !== null,

    async load(roomId) {
      if (!rooms) return readGovernance(null);
      const room = await rooms.findById(roomId);
      return readGovernance(room?.metadata ?? null);
    },

    async applySettings({ roomId, action, context, patch }) {
      authorize(action, context);
      if (!rooms) throw new Error("SF-SYS-PERSISTENCE-UNAVAILABLE");
      const room = await rooms.findById(roomId);
      if (!room) throw new Error("SF-ROOM-NOT-FOUND");
      const metadata = writeGovernance(room.metadata, patch);
      const updated = await rooms.update(roomId, { metadata });
      return readGovernance(updated.metadata);
    },

    async closeRoom({ roomId, context }) {
      authorize("close_room", context);
      if (!rooms) throw new Error("SF-SYS-PERSISTENCE-UNAVAILABLE");
      await rooms.update(roomId, { status: "ended", endedAt: new Date().toISOString() });
    },

    async setParticipantMuted({ memberId, muted, context }) {
      authorize(muted ? "mute_participant" : "unmute_participant", context);
      if (!members) throw new Error("SF-SYS-PERSISTENCE-UNAVAILABLE");
      await members.update(memberId, { isMutedByHost: muted });
    },

    async removeParticipant({ memberId, context }) {
      authorize("remove_participant", context);
      if (!members) throw new Error("SF-SYS-PERSISTENCE-UNAVAILABLE");
      await members.update(memberId, { state: "removed", leftAt: new Date().toISOString() });
    },
  };
}

export const ROOM_GOVERNANCE_SERVICE =
  createServiceToken<RoomGovernanceService>("RoomGovernanceService");
