/**
 * RoomService — Foundation §3, Sprint 1.6.
 *
 * Pure orchestration: validates the documented room invariants and announces
 * the catalog events. It owns no persistence and no transport.
 * Traceability: Database Spec §3.2, ADR-002 (lifecycle), ADR-013 (capacity).
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { CatalogEvent } from "@/domain/events/event-bus";
import type {
  RoomRole,
  RoomStatus,
  RoomVisibility,
  SessionEndReason,
} from "@/domain/shared/domain-enums";
import { ROOM } from "@/shared/constants/system-constants";

import type { DomainServiceContext, Intent } from "./service-context";

/** ADR-002 §Transitions. `paused` is reserved and never written by v1. */
const ALLOWED_TRANSITIONS: Readonly<Record<RoomStatus, readonly RoomStatus[]>> = Object.freeze({
  lobby: ["active", "ended", "abandoned"],
  active: ["ended", "abandoned"],
  paused: ["active", "ended", "abandoned"],
  ended: [],
  abandoned: [],
});

export interface CreateRoomInput {
  readonly roomId: string;
  readonly code: string;
  readonly hostProfileId: string;
  readonly name: string;
  readonly visibility: RoomVisibility;
  readonly maxMembers?: number;
}

export interface RoomService {
  createRoom(input: CreateRoomInput, intent: Intent): Promise<CatalogEvent<"RoomCreated">>;
  selectProvider(
    input: { roomId: string; providerId: string; syncMode: string; complianceVerdict: string },
    intent: Intent,
  ): Promise<CatalogEvent<"RoomProviderSelected">>;
  joinMember(
    input: { roomId: string; profileId: string; role: RoomRole; currentMemberCount: number },
    intent: Intent,
  ): Promise<CatalogEvent<"MemberJoined">>;
  leaveMember(
    input: { roomId: string; profileId: string; leftReason: string },
    intent: Intent,
  ): Promise<CatalogEvent<"MemberLeft">>;
  removeMember(
    input: { roomId: string; profileId: string; removedByProfileId: string },
    intent: Intent,
  ): Promise<CatalogEvent<"MemberRemoved">>;
  setReady(
    input: { roomId: string; profileId: string; isReady: boolean },
    intent: Intent,
  ): Promise<CatalogEvent<"MemberReadyChanged">>;
  changeStatus(
    input: { roomId: string; fromStatus: RoomStatus; toStatus: RoomStatus; reason: string },
    intent: Intent,
  ): Promise<CatalogEvent<"RoomStatusChanged">>;
  endRoom(
    input: {
      roomId: string;
      endReason: SessionEndReason;
      participantProfileIds: readonly string[];
    },
    intent: Intent,
  ): Promise<CatalogEvent<"RoomEnded">>;
  canTransition(from: RoomStatus, to: RoomStatus): boolean;
  hasCapacity(currentMemberCount: number, maxMembers?: number): boolean;
}

export function createRoomService(context: DomainServiceContext): RoomService {
  const { events, clock } = context;

  const canTransition = (from: RoomStatus, to: RoomStatus): boolean =>
    ALLOWED_TRANSITIONS[from].includes(to);

  const hasCapacity = (count: number, maxMembers = ROOM.MAX_MEMBERS): boolean => count < maxMembers;

  return {
    canTransition,
    hasCapacity,

    createRoom(input, intent) {
      const maxMembers = input.maxMembers ?? ROOM.MAX_MEMBERS;
      if (maxMembers < ROOM.SCHEMA_MIN_MEMBERS || maxMembers > ROOM.MAX_MEMBERS) {
        throw domainError("INVALID_INPUT", {
          operation: "RoomService.createRoom",
          aggregateId: input.roomId,
        });
      }
      return events.publish(
        "RoomCreated",
        input.roomId,
        {
          roomId: input.roomId,
          code: input.code,
          hostProfileId: input.hostProfileId,
          name: input.name,
          visibility: input.visibility,
          maxMembers,
        },
        intent,
      );
    },

    selectProvider: (input, intent) =>
      events.publish("RoomProviderSelected", input.roomId, { ...input }, intent),

    joinMember(input, intent) {
      if (!hasCapacity(input.currentMemberCount)) {
        throw domainError("ROOM_CAPACITY_EXCEEDED", {
          operation: "RoomService.joinMember",
          aggregateId: input.roomId,
        });
      }
      return events.publish(
        "MemberJoined",
        input.roomId,
        { roomId: input.roomId, profileId: input.profileId, role: input.role },
        intent,
      );
    },

    leaveMember: (input, intent) =>
      events.publish("MemberLeft", input.roomId, { ...input }, intent),

    removeMember: (input, intent) =>
      events.publish("MemberRemoved", input.roomId, { ...input }, intent),

    setReady: (input, intent) =>
      events.publish("MemberReadyChanged", input.roomId, { ...input }, intent),

    changeStatus(input, intent) {
      if (!canTransition(input.fromStatus, input.toStatus)) {
        throw domainError("ROOM_INVALID_TRANSITION", {
          operation: "RoomService.changeStatus",
          aggregateId: input.roomId,
        });
      }
      return events.publish("RoomStatusChanged", input.roomId, { ...input }, intent);
    },

    endRoom: (input, intent) =>
      events.publish(
        "RoomEnded",
        input.roomId,
        {
          roomId: input.roomId,
          endReason: input.endReason,
          endedAt: clock.now().toISOString(),
          participantProfileIds: [...input.participantProfileIds],
        },
        intent,
      ),
  };
}
