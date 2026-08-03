/**
 * SocialService — Milestone F.0, Foundation §User & Social.
 *
 * The Domain owner of the friend graph: who may ask whom, who may answer, and
 * what a block does to an existing edge. The frozen event catalogue (v1.0) has
 * no friendship events and Milestone F.0 may not add any, so this service
 * publishes only the identity events that already exist (`UserBlocked`,
 * `UserUnblocked`) through `UserService`. Friendship transitions are recorded
 * in the store; surfacing them on the event bus is a later ADR.
 *
 * Repositories resolve lazily so an unconfigured backend yields an honest
 * unavailable verdict instead of an import-time crash.
 */
import { domainError } from "@/domain/errors/domain-errors";
import {
  isRepositoryBound,
  resolveRepository,
  BLOCK_REPOSITORY,
  FRIENDSHIP_REPOSITORY,
  PROFILE_DIRECTORY_REPOSITORY,
  RECENT_PARTNER_READ_REPOSITORY,
  type BlockRecord,
  type BlockRepository,
  type DirectoryProfileRecord,
  type EntityId,
  type FriendshipRecord,
  type FriendshipRepository,
  type ProfileDirectoryRepository,
  type RecentPartnerReadRepository,
  type RecentPartnerRecord,
  type RepositoryToken,
} from "@/repository";

import { createServiceToken } from "../service-registry";
import type { Intent } from "../services/service-context";
import type { UserService } from "../services/user-service";

/** How this viewer stands with another person. Drives every friend button. */
export type RelationshipKind =
  | "self"
  | "none"
  | "friends"
  | "outgoing_request"
  | "incoming_request"
  | "blocked" // the viewer blocked them
  | "blocked_by"; // they blocked the viewer

export interface Relationship {
  readonly kind: RelationshipKind;
  readonly friendshipId: EntityId | null;
}

export const MAX_SEARCH_RESULTS = 20;
export const MAX_RECENT_PARTNERS = 12;
/** Shorter terms match too much of the directory to be a useful search. */
export const MIN_SEARCH_TERM_LENGTH = 2;

export interface SocialService {
  /** False until a persistence adapter is bound at the composition root. */
  readonly isConfigured: boolean;

  listFriendships(profileId: EntityId): Promise<readonly FriendshipRecord[]>;
  listBlocks(profileId: EntityId): Promise<readonly BlockRecord[]>;
  listRecentPartners(profileId: EntityId): Promise<readonly RecentPartnerRecord[]>;

  /** Directory search. Blocked people are filtered by the store, not here. */
  searchProfiles(term: string, viewerProfileId: EntityId): Promise<readonly DirectoryProfileRecord[]>;
  getProfile(profileId: EntityId): Promise<DirectoryProfileRecord | null>;
  hydrateProfiles(profileIds: readonly EntityId[]): Promise<ReadonlyMap<EntityId, DirectoryProfileRecord>>;

  /** Classifies the viewer's standing with another person. Pure given inputs. */
  classify(
    viewerProfileId: EntityId,
    otherProfileId: EntityId,
    friendships: readonly FriendshipRecord[],
    blocks: readonly BlockRecord[],
  ): Relationship;

  sendRequest(viewerProfileId: EntityId, targetProfileId: EntityId): Promise<FriendshipRecord>;
  acceptRequest(viewerProfileId: EntityId, friendshipId: EntityId): Promise<FriendshipRecord>;
  declineRequest(viewerProfileId: EntityId, friendshipId: EntityId): Promise<FriendshipRecord>;
  cancelRequest(viewerProfileId: EntityId, friendshipId: EntityId): Promise<void>;
  removeFriend(viewerProfileId: EntityId, friendshipId: EntityId): Promise<void>;

  blockProfile(
    viewerProfileId: EntityId,
    targetProfileId: EntityId,
    reason: string,
    intent: Intent,
  ): Promise<void>;
  unblockProfile(viewerProfileId: EntityId, targetProfileId: EntityId, intent: Intent): Promise<void>;
}

export interface SocialServiceDependencies {
  readonly users: UserService;
}

function require_<T>(token: RepositoryToken<T>, operation: string): T {
  if (!isRepositoryBound(token)) {
    throw domainError("SERVICE_UNAVAILABLE", { operation });
  }
  return resolveRepository(token);
}

export function createSocialService(deps: SocialServiceDependencies): SocialService {
  const { users } = deps;

  const friendships = (operation: string): FriendshipRepository =>
    require_(FRIENDSHIP_REPOSITORY, operation);
  const blocks = (operation: string): BlockRepository => require_(BLOCK_REPOSITORY, operation);
  const directory = (operation: string): ProfileDirectoryRepository =>
    require_(PROFILE_DIRECTORY_REPOSITORY, operation);
  const partners = (operation: string): RecentPartnerReadRepository =>
    require_(RECENT_PARTNER_READ_REPOSITORY, operation);

  /** Loads an edge and refuses it unless the viewer is genuinely a party. */
  async function loadOwnEdge(
    viewerProfileId: EntityId,
    friendshipId: EntityId,
    operation: string,
  ): Promise<FriendshipRecord> {
    const record = await friendships(operation).findById(friendshipId);
    if (!record) {
      throw domainError("FRIENDSHIP_NOT_FOUND", { operation, aggregateId: friendshipId });
    }
    const isParty =
      record.requesterProfileId === viewerProfileId ||
      record.addresseeProfileId === viewerProfileId;
    if (!isParty) {
      throw domainError("FRIENDSHIP_FORBIDDEN", { operation, aggregateId: friendshipId });
    }
    return record;
  }

  return {
    get isConfigured() {
      return isRepositoryBound(FRIENDSHIP_REPOSITORY);
    },

    listFriendships: (profileId) =>
      friendships("SocialService.listFriendships").listForProfile(profileId),

    listBlocks: (profileId) => blocks("SocialService.listBlocks").listForProfile(profileId),

    listRecentPartners: (profileId) =>
      partners("SocialService.listRecentPartners").listForProfile(profileId, MAX_RECENT_PARTNERS),

    async searchProfiles(term, viewerProfileId) {
      const trimmed = term.trim();
      if (trimmed.length < MIN_SEARCH_TERM_LENGTH) return [];
      const results = await directory("SocialService.searchProfiles").search(
        trimmed,
        MAX_SEARCH_RESULTS,
      );
      // The viewer is never a search result for themselves.
      return results.filter((record) => record.id !== viewerProfileId);
    },

    getProfile: (profileId) => directory("SocialService.getProfile").findById(profileId),

    async hydrateProfiles(profileIds) {
      const unique = [...new Set(profileIds)];
      if (unique.length === 0) return new Map();
      const records = await directory("SocialService.hydrateProfiles").findManyByIds(unique);
      return new Map(records.map((record) => [record.id, record]));
    },

    classify(viewerProfileId, otherProfileId, friendshipList, blockList) {
      if (viewerProfileId === otherProfileId) {
        return { kind: "self", friendshipId: null };
      }
      // A block outranks every friendship state: it is the strongest signal
      // either person has expressed (ADR-011).
      if (blockList.some((block) => block.blockedProfileId === otherProfileId)) {
        return { kind: "blocked", friendshipId: null };
      }

      const edge = friendshipList.find(
        (record) =>
          (record.requesterProfileId === viewerProfileId &&
            record.addresseeProfileId === otherProfileId) ||
          (record.requesterProfileId === otherProfileId &&
            record.addresseeProfileId === viewerProfileId),
      );
      if (!edge) return { kind: "none", friendshipId: null };

      if (edge.status === "accepted") return { kind: "friends", friendshipId: edge.id };
      if (edge.status === "pending") {
        return edge.requesterProfileId === viewerProfileId
          ? { kind: "outgoing_request", friendshipId: edge.id }
          : { kind: "incoming_request", friendshipId: edge.id };
      }
      // Declined and cancelled edges are closed: the pair may ask again.
      return { kind: "none", friendshipId: edge.id };
    },

    async sendRequest(viewerProfileId, targetProfileId) {
      const operation = "SocialService.sendRequest";
      if (viewerProfileId === targetProfileId) {
        throw domainError("INVALID_INPUT", { operation, aggregateId: viewerProfileId });
      }

      const repository = friendships(operation);
      const existing = await repository.findBetween(viewerProfileId, targetProfileId);

      if (existing?.status === "accepted") return existing;
      // Answering an incoming request by "asking back" is an acceptance, which
      // is what the person plainly meant.
      if (existing?.status === "pending") {
        if (existing.addresseeProfileId === viewerProfileId) {
          return repository.setStatus(existing.id, "accepted", new Date().toISOString());
        }
        return existing;
      }
      // A closed edge may point the other way; reviving it must not silently
      // reverse who asked, so drop it and create the request afresh.
      if (existing && existing.requesterProfileId !== viewerProfileId) {
        await repository.remove(existing.id);
      }
      return repository.request(viewerProfileId, targetProfileId);
    },

    async acceptRequest(viewerProfileId, friendshipId) {
      const operation = "SocialService.acceptRequest";
      const edge = await loadOwnEdge(viewerProfileId, friendshipId, operation);
      // Only the person who was asked can accept.
      if (edge.addresseeProfileId !== viewerProfileId || edge.status !== "pending") {
        throw domainError("FRIENDSHIP_INVALID_STATE", { operation, aggregateId: friendshipId });
      }
      return friendships(operation).setStatus(friendshipId, "accepted", new Date().toISOString());
    },

    async declineRequest(viewerProfileId, friendshipId) {
      const operation = "SocialService.declineRequest";
      const edge = await loadOwnEdge(viewerProfileId, friendshipId, operation);
      if (edge.addresseeProfileId !== viewerProfileId || edge.status !== "pending") {
        throw domainError("FRIENDSHIP_INVALID_STATE", { operation, aggregateId: friendshipId });
      }
      return friendships(operation).setStatus(friendshipId, "declined", new Date().toISOString());
    },

    async cancelRequest(viewerProfileId, friendshipId) {
      const operation = "SocialService.cancelRequest";
      const edge = await loadOwnEdge(viewerProfileId, friendshipId, operation);
      if (edge.requesterProfileId !== viewerProfileId || edge.status !== "pending") {
        throw domainError("FRIENDSHIP_INVALID_STATE", { operation, aggregateId: friendshipId });
      }
      // A withdrawn request leaves no trace for the other person to read.
      await friendships(operation).remove(friendshipId);
    },

    async removeFriend(viewerProfileId, friendshipId) {
      const operation = "SocialService.removeFriend";
      const edge = await loadOwnEdge(viewerProfileId, friendshipId, operation);
      if (edge.status !== "accepted") {
        throw domainError("FRIENDSHIP_INVALID_STATE", { operation, aggregateId: friendshipId });
      }
      await friendships(operation).remove(friendshipId);
    },

    async blockProfile(viewerProfileId, targetProfileId, reason, intent) {
      const operation = "SocialService.blockProfile";
      if (viewerProfileId === targetProfileId) {
        throw domainError("INVALID_INPUT", { operation, aggregateId: viewerProfileId });
      }

      // Blocking ends any friendship: leaving the edge behind would keep the
      // blocked person visible in a roster they must disappear from.
      const edge = await friendships(operation).findBetween(viewerProfileId, targetProfileId);
      if (edge) {
        await friendships(operation).remove(edge.id);
      }
      await blocks(operation).block(viewerProfileId, targetProfileId, reason || null);
      await users.blockUser(
        { blockerProfileId: viewerProfileId, blockedProfileId: targetProfileId, reason },
        intent,
      );
    },

    async unblockProfile(viewerProfileId, targetProfileId, intent) {
      const operation = "SocialService.unblockProfile";
      await blocks(operation).unblock(viewerProfileId, targetProfileId);
      // Unblocking restores visibility, never the former friendship.
      await users.unblockUser(
        { blockerProfileId: viewerProfileId, blockedProfileId: targetProfileId },
        intent,
      );
    },
  };
}

export const SOCIAL_SERVICE = createServiceToken<SocialService>("SocialService");
