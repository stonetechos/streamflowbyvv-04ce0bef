/**
 * Room read model — Sprint 2.0.
 *
 * A read-only composition over the Sprint 1.7 room repositories, plus the
 * single presentation flag the Waiting Room needs (readiness). It contains no
 * business rule: lifecycle, capacity, and invite policy stay in the Sprint 1.6
 * services and in `RoomFlowService` (Build Rules §1).
 *
 * Readiness is stored in the opaque membership `metadata` bag under
 * `waiting_room_ready`. It is a coordination signal shown to humans, never an
 * input to a Domain rule — the `metadata` contract in `room.types.ts` holds.
 *
 * Realtime is exposed as a Domain-shaped notice so the Feature layer never
 * reaches past Domain to a transport (Foundation §2/§4).
 */
import { createServiceToken } from "@/domain/service-registry";
import type { RoomService } from "@/domain/services/room-service";
import type { MembershipState } from "@/domain/shared/domain-enums";
import {
  INVITE_REPOSITORY,
  ROOM_MEMBER_REPOSITORY,
  ROOM_REPOSITORY,
  REALTIME_EVENT_SUBSCRIBER,
  isRepositoryBound,
  resolveRepository,
  type EntityId,
  type InviteRepository,
  type RealtimeEventSubscriber,
  type RoomMemberRepository,
  type RoomRepository,
} from "@/repository";

import type { Invite, MetadataBag, Room, RoomMember } from "./room.types";

/** Metadata key carrying the Waiting Room readiness signal. */
export const READINESS_METADATA_KEY = "waiting_room_ready";

/** Membership states that occupy a seat in the lobby. */
const LOBBY_STATES: readonly MembershipState[] = ["invited", "joined"];

/**
 * Room statuses a member may still be admitted into (ADR-002). Mirrors the
 * rule `RoomFlowService` enforces on the write path; stated once, here, so
 * Presentation never has to decide whether a seat is available.
 */
const JOINABLE_STATUSES: readonly string[] = ["lobby", "active"];

/** A realtime notice, stripped to what a view may legitimately react to. */
export interface RoomRealtimeNotice {
  readonly eventName: string;
  readonly aggregateId: string;
  readonly sequence: number;
  readonly occurredAt: string;
}

export type RoomRealtimeUnsubscribe = () => void;

export interface WaitingRoomSnapshot {
  readonly room: Room;
  readonly members: readonly RoomMember[];
  readonly pendingInvites: readonly Invite[];
  readonly viewerMembership: RoomMember | null;
  readonly joinedCount: number;
  /**
   * Whether this viewer may still take a seat. Decided here from the same
   * lifecycle and capacity rules the write path enforces (ADR-002, ADR-013),
   * so no hook or component evaluates business capacity for itself.
   */
  readonly canViewerJoin: boolean;
}

export interface RoomReadModel {
  loadWaitingRoom(roomId: EntityId, viewerProfileId: EntityId | null): Promise<WaitingRoomSnapshot>;
  /** Persists the viewer's readiness signal on their own membership row. */
  setReadiness(memberId: EntityId, ready: boolean): Promise<RoomMember>;
  /** Reads the readiness signal from a membership row. */
  isReady(member: RoomMember): boolean;
  /** Subscribes to room-scoped realtime notices. No-op when no transport is bound. */
  subscribeToRoom(
    roomId: EntityId,
    listener: (notice: RoomRealtimeNotice) => void,
  ): Promise<RoomRealtimeUnsubscribe>;
}

export interface RoomReadModelDependencies {
  readonly rooms: RoomRepository;
  readonly members: RoomMemberRepository;
  readonly invites: InviteRepository;
  /** Absent when the deployment has no realtime transport bound. */
  readonly realtime: RealtimeEventSubscriber | null;
  /** Owner of the capacity rule (ADR-013). Consulted, never re-implemented. */
  readonly roomService: RoomService;
}

export function resolveRoomReadModelDependencies(
  roomService: RoomService,
): RoomReadModelDependencies {
  return {
    roomService,
    rooms: resolveRepository(ROOM_REPOSITORY),
    members: resolveRepository(ROOM_MEMBER_REPOSITORY),
    invites: resolveRepository(INVITE_REPOSITORY),
    realtime: isRepositoryBound(REALTIME_EVENT_SUBSCRIBER)
      ? resolveRepository(REALTIME_EVENT_SUBSCRIBER)
      : null,
  };
}

function withReadiness(metadata: MetadataBag, ready: boolean): MetadataBag {
  return Object.freeze({ ...metadata, [READINESS_METADATA_KEY]: ready });
}

export function createRoomReadModel(deps: RoomReadModelDependencies): RoomReadModel {
  const { rooms, members, invites, realtime, roomService } = deps;

  const isReady = (member: RoomMember): boolean => member.metadata[READINESS_METADATA_KEY] === true;

  return {
    async loadWaitingRoom(roomId, viewerProfileId) {
      const room = await rooms.findById(roomId);
      if (!room) {
        throw new Error("SF-ROOM-NOT-FOUND");
      }

      const memberPage = await members.listByRoom(roomId, { states: LOBBY_STATES });
      const invitePage = await invites.listByRoom(roomId, { statuses: ["pending"] });
      const roster = memberPage.items;
      const viewerMembership =
        viewerProfileId === null
          ? null
          : (roster.find((member) => member.profileId === viewerProfileId) ?? null);

      // Capacity is RoomService's rule; a seat already held by this viewer is
      // not a seat they need to take again.
      const occupied = roster.filter((member) => LOBBY_STATES.includes(member.state)).length;
      const seats =
        viewerMembership && LOBBY_STATES.includes(viewerMembership.state) ? occupied - 1 : occupied;
      const canViewerJoin =
        viewerMembership?.state !== "joined" &&
        JOINABLE_STATUSES.includes(room.status) &&
        roomService.hasCapacity(seats, room.maxMembers);

      return Object.freeze({
        room,
        members: roster,
        pendingInvites: invitePage.items,
        viewerMembership,
        joinedCount: roster.filter((member) => member.state === "joined").length,
        canViewerJoin,
      });
    },

    async setReadiness(memberId, ready) {
      const member = await members.findById(memberId);
      if (member === null) throw new Error("SF-ROOM-MEMBER-NOT-FOUND");

      const updated = await members.update(memberId, {
        metadata: withReadiness(member.metadata, ready),
      });

      // Readiness is a room-wide signal: without a published event the other
      // members receive no realtime notice and their roster never re-reads
      // (Foundation §4). The catalog event is the only transport.
      await roomService.setReady(
        { roomId: updated.roomId, profileId: updated.profileId, isReady: ready },
        { correlationId: crypto.randomUUID(), actorProfileId: updated.profileId },
      );

      return updated;
    },

    isReady,

    async subscribeToRoom(roomId, listener) {
      if (!realtime) return () => undefined;
      return realtime.subscribe("room", roomId, (event) =>
        listener({
          eventName: event.eventName,
          aggregateId: event.aggregateId,
          sequence: event.sequence,
          occurredAt: event.occurredAt,
        }),
      );
    },
  };
}

export const ROOM_READ_MODEL = createServiceToken<RoomReadModel>("RoomReadModel");
