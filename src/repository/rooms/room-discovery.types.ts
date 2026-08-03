/**
 * Room discovery contract — Sprint J.1.
 *
 * Discovery is NOT admission. This port answers one question only: "does a
 * joinable room exist behind this exact code, and what may a stranger be told
 * about it before knocking?" It returns the minimum a guest needs to recognise
 * the room they were invited to, and nothing else — never playback state,
 * never membership, never metadata, never the host's identifiers.
 *
 * Whether the guest is actually admitted stays with `RoomFlowService`
 * (capacity, lifecycle, blocks, readiness). This port never decides.
 *
 * Layer position: Repository contract. No table, driver, or vendor appears
 * here (Foundation §5, Build Rules §25).
 */
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";
import type { EntityCode, EntityId } from "@/repository/repository.types";
import type { Room } from "@/domain/rooms/room.types";
import type { RoomStatus } from "@/domain/shared/domain-enums";

/** The complete set of facts a non-member may learn from a room code. */
export interface RoomDiscovery {
  readonly roomId: EntityId;
  readonly name: string;
  readonly providerId: EntityId | null;
  readonly hostDisplayName: string | null;
  readonly memberCount: number;
  readonly capacity: number;
  readonly status: RoomStatus;
}

export interface RoomDiscoveryRepository {
  /**
   * Resolves an exact room code to its minimal public face.
   * Returns `null` only when no room carries that code at all. Every other
   * refusal (ended, full, blocked, already joined) is reported by `explain`
   * so the person is told the truth instead of "no such code".
   */
  discoverByCode(code: EntityCode): Promise<RoomDiscovery | null>;

  /**
   * Loads the room a guest is about to knock on, by exact id, and only while
   * it is joinable. Still discovery: it grants no membership and applies no
   * admission rule — RoomFlowService alone decides whether the guest is let
   * in. Non-members cannot list rooms; they may only resolve one they were
   * pointed at.
   */
  findJoinableById(roomId: EntityId): Promise<Room | null>;

  /**
   * Sprint J.1.5 — the facts behind a refusal, for a room the caller was
   * pointed at by exact code or exact id. Facts only: this port never decides
   * admission and never lists rooms. `null` means no room carries that code
   * or id.
   */
  explain(input: RoomAdmissionLookup): Promise<RoomAdmissionFacts | null>;
}

/** Exactly one of these identifies the room the caller was pointed at. */
export interface RoomAdmissionLookup {
  readonly code?: EntityCode;
  readonly roomId?: EntityId;
}

/**
 * The observable state of a room plus the caller's relationship to it. It
 * carries no verdict: `RoomFlowService` alone turns these facts into a
 * refusal (Foundation §5).
 */
export interface RoomAdmissionFacts extends RoomDiscovery {
  readonly isDeleted: boolean;
  readonly isBlocked: boolean;
  /** The caller's membership state in this room, when they have one. */
  readonly viewerState: "invited" | "joined" | "left" | "removed" | null;
  /** Another still-open room the caller is currently joined to, if any. */
  readonly viewerOtherRoomId: EntityId | null;
}

export const ROOM_DISCOVERY_REPOSITORY: RepositoryToken<RoomDiscoveryRepository> =
  createRepositoryToken<RoomDiscoveryRepository>("RoomDiscoveryRepository");
