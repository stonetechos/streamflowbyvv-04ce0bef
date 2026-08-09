/**
 * Home read model — Milestone E.
 *
 * The home screen asks one question — "what can this person do right now?" —
 * and it must be answered in one place. That answer spans three repositories
 * (rooms, memberships, invites), so composing it in a hook would put a
 * cross-aggregate read in the Feature layer and duplicate it on every surface
 * that needs the same picture.
 *
 * Like `RoomReadModel`, this is composition without policy: it decides nothing
 * about capacity, lifecycle or invite validity. Those verdicts stay with
 * `RoomService` and `RoomFlowService` (Build Rules §1).
 *
 * Traceability: MVP §5 (Home experience), ADR-002 (lifecycle), ADR-006
 * (invite model).
 */
import { createServiceToken } from "@/domain/service-registry";
import type { RoomStatus } from "@/domain/shared/domain-enums";
import {
  INVITE_REPOSITORY,
  ROOM_MEMBER_REPOSITORY,
  ROOM_REPOSITORY,
  resolveRepository,
  type EntityId,
  type InviteRepository,
  type RoomMemberRepository,
  type RoomRepository,
} from "@/repository";

import { readRoomMediaRef } from "@/domain/watch/watch-source";

import { classifyRoomActivity, type RoomActivity } from "./room-activity";
import type { Invite, Room, RoomMember } from "./room.types";

/** Rooms a person can still walk back into (ADR-002). */
const LIVE_STATUSES: readonly RoomStatus[] = ["lobby", "active", "paused"];

/** Rooms that are over, kept for the "recent" rail. */
const CLOSED_STATUSES: readonly RoomStatus[] = ["ended", "abandoned"];

/** Upper bound on rooms considered, so the per-room reads stay bounded. */
const ROOM_SCAN_LIMIT = 24;

export interface HomeRoomSummary {
  readonly room: Room;
  /** This viewer's membership in that room. Always present in a home summary. */
  readonly membership: RoomMember;
  /** Seats currently taken, for the "2 of 4" line. */
  readonly memberCount: number;
  readonly isHost: boolean;
  /** True when the room is still live and the viewer has actually joined it. */
  readonly isResumable: boolean;
  /** Live / dormant / closed, decided by `classifyRoomActivity`. */
  readonly activity: RoomActivity;
}

export interface HomeInviteSummary {
  readonly invite: Invite;
  /** Null when the room behind an invite is no longer readable by this viewer. */
  readonly room: Room | null;
}

export interface HomeSnapshot {
  /** The single most compelling room to re-enter, or null on a quiet day. */
  readonly continueRoom: HomeRoomSummary | null;
  /** Live rooms excluding `continueRoom`, newest first. */
  readonly liveRooms: readonly HomeRoomSummary[];
  /** Rooms that have finished, newest first. */
  readonly recentRooms: readonly HomeRoomSummary[];
  /**
   * Live rows that have gone quiet: a solo lobby nobody touched. They are not
   * offered as "continue" and are not surfaced on Home.
   */
  readonly dormantRooms: readonly HomeRoomSummary[];
  readonly pendingInvites: readonly HomeInviteSummary[];
  /**
   * Milestone F.0 — invitations already answered or lapsed, newest first, so a
   * declined or expired invite is a visible record rather than a dead end.
   */
  readonly answeredInvites: readonly HomeInviteSummary[];
  readonly hostedRoomCount: number;
  /** True when this profile has never been in a room — drives first-run copy. */
  readonly isFirstTime: boolean;
}

export interface HomeReadModel {
  loadHome(viewerProfileId: EntityId): Promise<HomeSnapshot>;
}

export interface HomeReadModelDependencies {
  readonly rooms: RoomRepository;
  readonly members: RoomMemberRepository;
  readonly invites: InviteRepository;
}

export function resolveHomeReadModelDependencies(): HomeReadModelDependencies {
  return {
    rooms: resolveRepository(ROOM_REPOSITORY),
    members: resolveRepository(ROOM_MEMBER_REPOSITORY),
    invites: resolveRepository(INVITE_REPOSITORY),
  };
}

function newestFirst(a: HomeRoomSummary, b: HomeRoomSummary): number {
  return b.room.updatedAt.localeCompare(a.room.updatedAt);
}

export function createHomeReadModel(deps: HomeReadModelDependencies): HomeReadModel {
  const { rooms, members, invites } = deps;

  return {
    async loadHome(viewerProfileId) {
      const roomPage = await rooms.list({ memberProfileId: viewerProfileId });
      const candidates = roomPage.items.slice(0, ROOM_SCAN_LIMIT);
      const now = Date.now();

      // Per-room membership and seat count. Bounded by ROOM_SCAN_LIMIT and
      // issued concurrently; the repository layer owns any batching it wants.
      const summaries = await Promise.all(
        candidates.map(async (room): Promise<HomeRoomSummary | null> => {
          const membership = await members.findByRoomAndProfile(room.id, viewerProfileId);
          if (!membership) return null;
          const memberCount = await members.countByRoom(room.id, ["invited", "joined"]);
          const mediaRef = readRoomMediaRef(room.metadata);
          const activity = classifyRoomActivity({
            status: room.status,
            hasMedia: mediaRef !== null && mediaRef.validity !== "invalid",
            memberCount,
            updatedAt: room.updatedAt,
            now,
          });
          return {
            room,
            membership,
            memberCount,
            isHost: room.hostProfileId === viewerProfileId,
            // A dormant lobby is not something to "continue": nobody is there
            // and nothing is happening in it.
            isResumable:
              membership.state === "joined" &&
              LIVE_STATUSES.includes(room.status) &&
              activity === "live",
            activity,
          };
        }),
      );

      const present = summaries.filter((entry): entry is HomeRoomSummary => entry !== null);
      const live = present
        .filter((entry) => LIVE_STATUSES.includes(entry.room.status) && entry.activity === "live")
        .sort(newestFirst);
      const dormant = present.filter((entry) => entry.activity === "dormant").sort(newestFirst);
      const closed = present
        .filter((entry) => CLOSED_STATUSES.includes(entry.room.status))
        .sort(newestFirst);

      // "Continue" prefers a room already joined; a room merely invited to
      // belongs in the invitations rail, not in a resume affordance.
      const continueRoom = live.find((entry) => entry.isResumable) ?? null;

      const hydrate = async (invite: Invite): Promise<HomeInviteSummary> => ({
        invite,
        room: await rooms.findById(invite.roomId).catch(() => null),
      });

      const [invitePage, answeredPage] = await Promise.all([
        invites.listForInvitee(viewerProfileId, { statuses: ["pending"] }),
        invites
          .listForInvitee(viewerProfileId, { statuses: ["accepted", "declined", "expired"] })
          .catch(() => ({ items: [] as Invite[] })),
      ]);

      const [pendingInvites, answeredInvites] = await Promise.all([
        Promise.all(invitePage.items.map(hydrate)),
        Promise.all(answeredPage.items.map(hydrate)),
      ]);

      return Object.freeze({
        continueRoom,
        liveRooms: live.filter((entry) => entry !== continueRoom),
        // "Recent" means a room that is no longer happening — closed, or open
        // but gone quiet. A dormant room must still be findable from Home.
        recentRooms: [...dormant, ...closed].sort(newestFirst),
        dormantRooms: dormant,
        pendingInvites,
        answeredInvites: [...answeredInvites].sort((a, b) =>
          b.invite.createdAt.localeCompare(a.invite.createdAt),
        ),
        hostedRoomCount: present.filter((entry) => entry.isHost).length,
        isFirstTime: present.length === 0 && pendingInvites.length === 0,
      });
    },
  };
}

export const HOME_READ_MODEL = createServiceToken<HomeReadModel>("HomeReadModel");
