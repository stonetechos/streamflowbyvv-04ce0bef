/**
 * RoomFlowService — Sprint 1.8.
 *
 * The complete room business flow: it wires the Sprint 1.6 orchestration
 * services (RoomService, InvitationService, ComplianceService) to the Sprint
 * 1.7 room repositories and publishes the catalog events for every use case.
 *
 * Layer position: Domain. It depends on repository CONTRACTS resolved from the
 * registry and never on an adapter, a table, or a driver (Foundation §2, §5).
 * Rule ownership is unchanged — capacity, lifecycle transitions, and invite
 * expiry are still decided by the Sprint 1.6 services; this service sequences
 * them against persistence and owns the transaction boundary.
 *
 * Traceability: Database Spec §3.2/§3.3/§3.11, ADR-002 (lifecycle), ADR-004
 * (optimistic concurrency), ADR-006 (invites), ADR-011 (blocks), ADR-013
 * (capacity), Foundation §14 (constants).
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { CatalogEvent } from "@/domain/events/event-bus";
import type {
  Invite,
  InviteDraft,
  IsoTimestamp,
  MetadataBag,
  Room,
  RoomMember,
  RoomState,
} from "@/domain/rooms/room.types";
import type { ComplianceRule, ComplianceService } from "@/domain/services/compliance-service";
import type { InvitationService } from "@/domain/services/invitation-service";
import type { RoomService } from "@/domain/services/room-service";
import type { Intent } from "@/domain/services/service-context";
import type {
  InviteChannel,
  RoomRole,
  RoomVisibility,
  SessionEndReason,
} from "@/domain/shared/domain-enums";
import type { Clock } from "@/domain/events/event.types";
import {
  CODE_ALLOCATOR,
  CODE_PREFIXES,
  INVITE_REPOSITORY,
  ROOM_MEMBER_REPOSITORY,
  ROOM_DISCOVERY_REPOSITORY,
  ROOM_REPOSITORY,
  ROOM_STATE_REPOSITORY,
  ROOM_UNIT_OF_WORK,
  isRepositoryBound,
  resolveRepository,
  type CodeAllocator,
  type EntityId,
  type InviteRepository,
  type Page,
  type RoomMemberRepository,
  type RoomDiscovery,
  type RoomDiscoveryRepository,
  type RoomQuery,
  type RoomRepository,
  type RoomStateRepository,
  type RoomUnitOfWork,
} from "@/repository";
import { ROOM } from "@/shared/constants/system-constants";

/** Membership states that occupy a seat (ADR-013). */
const OCCUPYING_STATES = ["invited", "joined"] as const;

/** Room statuses a member may still be admitted into (ADR-002). */
const JOINABLE_STATUSES = ["lobby", "active"] as const;

export interface RoomCreationRequest {
  readonly hostProfileId: EntityId;
  readonly name: string;
  readonly visibility: RoomVisibility;
  readonly maxMembers?: number;
  readonly scheduledStartAt?: IsoTimestamp | null;
  readonly metadata?: MetadataBag;
}

export interface RoomCreationResult {
  readonly room: Room;
  readonly state: RoomState;
  readonly hostMember: RoomMember;
  readonly event: CatalogEvent<"RoomCreated">;
}

/**
 * ADR-011/Foundation §11: an invite into a provider-backed room is a
 * provider-touching action, so the caller must present the compliance context.
 * Absence of rules is never permission — the verdict blocks.
 */
export interface ComplianceContext {
  readonly regionCode: string;
  readonly rules: readonly ComplianceRule[];
  readonly origin?: string;
}

export interface InviteCreationRequest {
  readonly roomId: EntityId;
  readonly inviterProfileId: EntityId;
  readonly channel: InviteChannel;
  readonly inviteeProfileId?: EntityId | null;
  readonly compliance?: ComplianceContext;
  readonly metadata?: MetadataBag;
}

export interface RoomFlowService {
  createRoom(request: RoomCreationRequest, intent: Intent): Promise<RoomCreationResult>;
  getRoom(roomId: EntityId): Promise<Room>;
  getRoomByCode(code: string): Promise<Room>;
  /**
   * Sprint J.1 — discovery, not admission. Resolves an exact room code to the
   * minimal facts a not-yet-member may see. Admission is still decided by
   * `joinRoom`; this method re-implements no capacity, lifecycle, or
   * readiness rule.
   */
  discoverRoomByCode(code: string): Promise<RoomDiscovery>;
  listRooms(query?: RoomQuery): Promise<Page<Room>>;
  endRoom(
    input: { roomId: EntityId; actorProfileId: EntityId; endReason?: SessionEndReason },
    intent: Intent,
  ): Promise<Room>;
  archiveRoom(input: { roomId: EntityId; actorProfileId: EntityId }, intent: Intent): Promise<void>;
  joinRoom(
    input: { roomId: EntityId; profileId: EntityId; role?: RoomRole },
    intent: Intent,
  ): Promise<RoomMember>;
  leaveRoom(
    input: { roomId: EntityId; profileId: EntityId; leftReason?: string },
    intent: Intent,
  ): Promise<RoomMember>;
  removeMember(
    input: { roomId: EntityId; profileId: EntityId; actorProfileId: EntityId },
    intent: Intent,
  ): Promise<RoomMember>;
  createInvite(request: InviteCreationRequest, intent: Intent): Promise<Invite>;
  acceptInvite(
    input: { inviteId: EntityId; profileId: EntityId },
    intent: Intent,
  ): Promise<{ invite: Invite; member: RoomMember }>;
  declineInvite(
    input: { inviteId: EntityId; profileId: EntityId },
    intent: Intent,
  ): Promise<Invite>;
  expireInvite(input: { inviteId: EntityId }, intent: Intent): Promise<Invite>;
}

export interface RoomFlowDependencies {
  readonly rooms: RoomRepository;
  readonly roomStates: RoomStateRepository;
  readonly members: RoomMemberRepository;
  readonly invites: InviteRepository;
  readonly codes: CodeAllocator;
  /** Optional: absent adapters simply make code discovery unavailable. */
  readonly discovery?: RoomDiscoveryRepository | undefined;
  readonly unitOfWork: RoomUnitOfWork;
  readonly roomService: RoomService;
  readonly invitationService: InvitationService;
  readonly complianceService: ComplianceService;
  readonly clock: Clock;
}

/** Sequential fallback when no adapter offers a real transaction boundary. */
const PASSTHROUGH_UNIT_OF_WORK: RoomUnitOfWork = { run: <T>(work: () => Promise<T>) => work() };

/** Resolves the repository cluster lazily so an unconfigured backend still boots. */
export function resolveRoomFlowDependencies(services: {
  roomService: RoomService;
  invitationService: InvitationService;
  complianceService: ComplianceService;
  clock: Clock;
}): RoomFlowDependencies {
  return {
    rooms: resolveRepository(ROOM_REPOSITORY),
    roomStates: resolveRepository(ROOM_STATE_REPOSITORY),
    members: resolveRepository(ROOM_MEMBER_REPOSITORY),
    invites: resolveRepository(INVITE_REPOSITORY),
    codes: resolveRepository(CODE_ALLOCATOR),
    discovery: isRepositoryBound(ROOM_DISCOVERY_REPOSITORY)
      ? resolveRepository(ROOM_DISCOVERY_REPOSITORY)
      : undefined,
    unitOfWork: isRepositoryBound(ROOM_UNIT_OF_WORK)
      ? resolveRepository(ROOM_UNIT_OF_WORK)
      : PASSTHROUGH_UNIT_OF_WORK,
    ...services,
  };
}

export function createRoomFlowService(deps: RoomFlowDependencies): RoomFlowService {
  const {
    rooms,
    roomStates,
    members,
    invites,
    codes,
    discovery,
    unitOfWork,
    roomService,
    invitationService,
    complianceService,
    clock,
  } = deps;

  const nowIso = (): IsoTimestamp => clock.now().toISOString();

  const requireRoom = async (roomId: EntityId, operation: string): Promise<Room> => {
    const room = await rooms.findById(roomId);
    if (!room) throw domainError("ROOM_NOT_FOUND", { operation, aggregateId: roomId });
    return room;
  };

  const requireInvite = async (inviteId: EntityId, operation: string): Promise<Invite> => {
    const invite = await invites.findById(inviteId);
    if (!invite) throw domainError("INVITE_NOT_FOUND", { operation, aggregateId: inviteId });
    return invite;
  };

  const requireHost = (room: Room, actorProfileId: EntityId, operation: string): void => {
    if (room.hostProfileId !== actorProfileId) {
      throw domainError("ROOM_FORBIDDEN", { operation, aggregateId: room.id });
    }
  };

  const requireJoinable = (room: Room, operation: string): void => {
    if (!JOINABLE_STATUSES.includes(room.status as (typeof JOINABLE_STATUSES)[number])) {
      throw domainError("ROOM_NOT_ACTIVE", { operation, aggregateId: room.id });
    }
  };

  /** Admits a profile, enforcing capacity and re-using a prior membership row. */
  const admit = async (
    room: Room,
    profileId: EntityId,
    role: RoomRole,
    operation: string,
    intent: Intent,
  ): Promise<RoomMember> => {
    requireJoinable(room, operation);

    const existing = await members.findByRoomAndProfile(room.id, profileId);
    if (existing?.state === "joined") {
      throw domainError("ROOM_ALREADY_MEMBER", { operation, aggregateId: room.id });
    }

    const occupied = await members.countByRoom(room.id, OCCUPYING_STATES);
    const seats =
      existing && OCCUPYING_STATES.includes(existing.state as "invited") ? occupied - 1 : occupied;

    // Capacity is decided by RoomService; the event it returns is the record.
    await roomService.joinMember(
      { roomId: room.id, profileId, role, currentMemberCount: seats },
      intent,
    );

    const joinedAt = nowIso();
    return existing
      ? members.update(existing.id, { state: "joined", role, joinedAt, leftAt: null })
      : members.create({
          roomId: room.id,
          profileId,
          role,
          state: "joined",
          joinedAt,
        });
  };

  return {
    async createRoom(request, intent) {
      const maxMembers = request.maxMembers ?? ROOM.MAX_MEMBERS;
      const name = request.name.trim();
      if (name.length === 0) {
        throw domainError("INVALID_INPUT", { operation: "RoomFlowService.createRoom" });
      }

      const code = await codes.allocate(CODE_PREFIXES.ROOM);

      return unitOfWork.run(async () => {
        const room = await rooms.create({
          code,
          name,
          status: "lobby",
          visibility: request.visibility,
          hostProfileId: request.hostProfileId,
          maxMembers,
          scheduledStartAt: request.scheduledStartAt ?? null,
          ...(request.metadata ? { metadata: request.metadata } : {}),
        });

        try {
          const state = await roomStates.create({
            roomId: room.id,
            playbackStatus: "idle",
            // ADR-003: a room starts in manual sync until a provider is chosen.
            syncMode: "manual",
            positionMs: 0,
            lastActorProfileId: request.hostProfileId,
          });

          const hostMember = await members.create({
            roomId: room.id,
            profileId: request.hostProfileId,
            role: "host",
            state: "joined",
            joinedAt: nowIso(),
          });

          // Validation (capacity envelope) and the catalog event live in RoomService.
          const event = await roomService.createRoom(
            {
              roomId: room.id,
              code: room.code,
              hostProfileId: request.hostProfileId,
              name: room.name,
              visibility: room.visibility,
              maxMembers: room.maxMembers,
            },
            intent,
          );

          return { room, state, hostMember, event };
        } catch (error) {
          // Compensation: a half-built room must never be reachable.
          await rooms.remove(room.id).catch(() => undefined);
          throw error;
        }
      });
    },

    getRoom: (roomId) => requireRoom(roomId, "RoomFlowService.getRoom"),

    async getRoomByCode(code) {
      const room = await rooms.findByCode(code);
      if (!room) {
        throw domainError("ROOM_NOT_FOUND", { operation: "RoomFlowService.getRoomByCode" });
      }
      return room;
    },

    async discoverRoomByCode(code) {
      const operation = "RoomFlowService.discoverRoomByCode";
      if (!discovery) throw domainError("SERVICE_UNAVAILABLE", { operation });
      const found = await discovery.discoverByCode(code.trim().toUpperCase());
      if (!found) throw domainError("ROOM_NOT_FOUND", { operation });
      return found;
    },

    listRooms: (query) => rooms.list(query),

    async endRoom({ roomId, actorProfileId, endReason = "host_ended" }, intent) {
      const operation = "RoomFlowService.endRoom";
      const room = await requireRoom(roomId, operation);
      requireHost(room, actorProfileId, operation);

      // Transition legality is RoomService's decision (ADR-002).
      await roomService.changeStatus(
        { roomId, fromStatus: room.status, toStatus: "ended", reason: endReason },
        intent,
      );

      const endedAt = nowIso();
      const participants = await members.listByRoom(roomId, { states: ["joined"] });
      const updated = await rooms.update(roomId, { status: "ended", endedAt });

      for (const member of participants.items) {
        await members.update(member.id, { state: "left", leftAt: endedAt });
      }

      await roomService.endRoom(
        {
          roomId,
          endReason,
          participantProfileIds: participants.items.map((member) => member.profileId),
        },
        intent,
      );

      return updated;
    },

    async archiveRoom({ roomId, actorProfileId }, intent) {
      const operation = "RoomFlowService.archiveRoom";
      const room = await requireRoom(roomId, operation);
      requireHost(room, actorProfileId, operation);

      if (room.status !== "ended" && room.status !== "abandoned") {
        throw domainError("ROOM_INVALID_TRANSITION", { operation, aggregateId: roomId });
      }

      await roomService
        .changeStatus(
          { roomId, fromStatus: room.status, toStatus: room.status, reason: "archived" },
          intent,
        )
        .catch(() => undefined);

      // Archiving is the documented soft delete (Database Spec §4).
      await rooms.remove(roomId);
    },

    async joinRoom({ roomId, profileId, role = "guest" }, intent) {
      const operation = "RoomFlowService.joinRoom";
      // Sprint J.1 — a guest cannot read the room they are knocking on, so when
      // the member-scoped read finds nothing we fall back to the narrow
      // joinable-room lookup. It only *loads* the room; every admission rule
      // below is unchanged and still applied here.
      const room =
        (await rooms.findById(roomId)) ??
        (discovery ? await discovery.findJoinableById(roomId) : null);
      if (!room) throw domainError("ROOM_NOT_FOUND", { operation, aggregateId: roomId });
      return admit(room, profileId, role, operation, intent);
    },

    async leaveRoom({ roomId, profileId, leftReason = "voluntary" }, intent) {
      const operation = "RoomFlowService.leaveRoom";
      await requireRoom(roomId, operation);

      const member = await members.findByRoomAndProfile(roomId, profileId);
      if (!member || member.state !== "joined") {
        throw domainError("ROOM_MEMBER_NOT_FOUND", { operation, aggregateId: roomId });
      }

      const updated = await members.update(member.id, { state: "left", leftAt: nowIso() });
      await roomService.leaveMember({ roomId, profileId, leftReason }, intent);
      return updated;
    },

    async removeMember({ roomId, profileId, actorProfileId }, intent) {
      const operation = "RoomFlowService.removeMember";
      const room = await requireRoom(roomId, operation);
      requireHost(room, actorProfileId, operation);

      if (profileId === room.hostProfileId) {
        throw domainError("ROOM_FORBIDDEN", { operation, aggregateId: roomId });
      }

      const member = await members.findByRoomAndProfile(roomId, profileId);
      if (!member || member.state === "removed") {
        throw domainError("ROOM_MEMBER_NOT_FOUND", { operation, aggregateId: roomId });
      }

      const updated = await members.update(member.id, { state: "removed", leftAt: nowIso() });
      await roomService.removeMember(
        { roomId, profileId, removedByProfileId: actorProfileId },
        intent,
      );
      return updated;
    },

    async createInvite(request, intent) {
      const operation = "RoomFlowService.createInvite";
      const room = await requireRoom(request.roomId, operation);
      requireJoinable(room, operation);

      if (room.hostProfileId !== request.inviterProfileId) {
        const inviter = await members.findByRoomAndProfile(room.id, request.inviterProfileId);
        if (!inviter || inviter.state !== "joined" || inviter.role === "guest") {
          throw domainError("ROOM_FORBIDDEN", { operation, aggregateId: room.id });
        }
      }

      // Foundation §11: inviting into a provider-backed room is a
      // provider-touching action and must carry a compliance verdict first.
      if (room.providerId) {
        const { verdict } = await complianceService.issueVerdict(
          {
            providerId: room.providerId,
            regionCode: request.compliance?.regionCode ?? "",
            attemptedAction: "invite.create",
            origin: request.compliance?.origin ?? operation,
            rules: request.compliance?.rules ?? [],
          },
          intent,
        );
        complianceService.assertAllowed(verdict, room.providerId);
      }

      const occupied = await members.countByRoom(room.id, OCCUPYING_STATES);
      if (!roomService.hasCapacity(occupied, room.maxMembers)) {
        throw domainError("ROOM_CAPACITY_EXCEEDED", { operation, aggregateId: room.id });
      }

      const code = await codes.allocate(CODE_PREFIXES.INVITE);
      const expiresAt = invitationService.expiryFor(clock.now()).toISOString();

      const draft: InviteDraft = {
        code,
        roomId: room.id,
        channel: request.channel,
        status: "pending",
        inviterProfileId: request.inviterProfileId,
        inviteeProfileId: request.inviteeProfileId ?? null,
        expiresAt,
        ...(request.metadata ? { metadata: request.metadata } : {}),
      };

      const invite = await invites.create(draft);

      try {
        await invitationService.createInvite(
          {
            inviteId: invite.id,
            code: invite.code,
            roomId: room.id,
            channel: request.channel,
          },
          intent,
        );
      } catch (error) {
        await invites.remove(invite.id).catch(() => undefined);
        throw error;
      }

      return invite;
    },

    async acceptInvite({ inviteId, profileId }, intent) {
      const operation = "RoomFlowService.acceptInvite";
      const invite = await requireInvite(inviteId, operation);
      const room = await requireRoom(invite.roomId, operation);

      if (invite.inviteeProfileId && invite.inviteeProfileId !== profileId) {
        throw domainError("ROOM_FORBIDDEN", { operation, aggregateId: invite.roomId });
      }

      // Status and expiry rules stay with InvitationService (Foundation §14.2).
      await invitationService.accept(
        {
          inviteId,
          roomId: invite.roomId,
          profileId,
          status: invite.status,
          expiresAt: invite.expiresAt ?? nowIso(),
        },
        intent,
      );

      const member = await admit(room, profileId, "guest", operation, intent);
      const accepted = await invites.update(inviteId, {
        status: "accepted",
        acceptedAt: nowIso(),
        inviteeProfileId: profileId,
      });

      return { invite: accepted, member };
    },

    async declineInvite({ inviteId, profileId }, intent) {
      const operation = "RoomFlowService.declineInvite";
      const invite = await requireInvite(inviteId, operation);

      if (invite.inviteeProfileId && invite.inviteeProfileId !== profileId) {
        throw domainError("ROOM_FORBIDDEN", { operation, aggregateId: invite.roomId });
      }

      await invitationService.decline(
        { inviteId, roomId: invite.roomId, profileId, status: invite.status },
        intent,
      );

      return invites.update(inviteId, { status: "declined", declinedAt: nowIso() });
    },

    async expireInvite({ inviteId }, intent) {
      const operation = "RoomFlowService.expireInvite";
      const invite = await requireInvite(inviteId, operation);

      if (invite.status !== "pending") {
        throw domainError("INVITE_NOT_PENDING", { operation, aggregateId: invite.roomId });
      }
      if (!invite.expiresAt || !invitationService.isExpired(invite.expiresAt)) {
        throw domainError("INVALID_INPUT", { operation, aggregateId: invite.roomId });
      }

      await invitationService.expire({ inviteId, roomId: invite.roomId }, intent);
      return invites.update(inviteId, { status: "expired" });
    },
  };
}
