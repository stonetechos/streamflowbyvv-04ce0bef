/**
 * SocialReadModel — Milestone F.0.
 *
 * One cross-aggregate read for every social surface: the friends list, the two
 * request queues, the block list and the recent-partners rail all come from a
 * single pass so the screens agree with each other. Composition happens here in
 * the Domain, not in a component, and the shape returned is already the shape
 * the Presentation layer renders.
 */
import type {
  BlockRecord,
  DirectoryProfileRecord,
  EntityId,
  FriendshipRecord,
} from "@/repository";

import { createServiceToken } from "../service-registry";
import type { SocialService } from "./social-service";

/** A person plus the edge that ties them to the viewer. */
export interface SocialPersonView {
  readonly profileId: EntityId;
  readonly code: string;
  readonly displayName: string;
  readonly handle: string;
  readonly avatarPreset: string | null;
  /** Null for recent partners, who need not be friends. */
  readonly friendshipId: EntityId | null;
  readonly since: string | null;
}

export interface RecentPartnerView extends SocialPersonView {
  readonly lastWatchedAt: string;
  readonly sessionCount: number;
  readonly isFriend: boolean;
}

export interface BlockedPersonView extends SocialPersonView {
  readonly blockedAt: string;
}

export interface SocialOverview {
  readonly friends: readonly SocialPersonView[];
  readonly incomingRequests: readonly SocialPersonView[];
  readonly outgoingRequests: readonly SocialPersonView[];
  readonly blocked: readonly BlockedPersonView[];
  readonly recentPartners: readonly RecentPartnerView[];
  /** Raw edges, so a profile page can classify without a second round trip. */
  readonly friendships: readonly FriendshipRecord[];
  readonly blocks: readonly BlockRecord[];
}

export const EMPTY_SOCIAL_OVERVIEW: SocialOverview = Object.freeze({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  blocked: [],
  recentPartners: [],
  friendships: [],
  blocks: [],
});

export interface SocialReadModel {
  readonly isConfigured: boolean;
  load(viewerProfileId: EntityId): Promise<SocialOverview>;
}

export interface SocialReadModelDependencies {
  readonly social: SocialService;
}

function toPersonView(
  profile: DirectoryProfileRecord | undefined,
  profileId: EntityId,
  friendshipId: EntityId | null,
  since: string | null,
): SocialPersonView {
  return {
    profileId,
    code: profile?.code ?? "",
    // A person whose profile row is unreadable is still a real edge; showing a
    // neutral placeholder beats dropping them out of the list silently.
    displayName: profile?.displayName ?? "StreamFlow member",
    handle: profile?.handle ?? "",
    avatarPreset: profile?.avatarPreset ?? null,
    friendshipId,
    since,
  };
}

export function createSocialReadModel(deps: SocialReadModelDependencies): SocialReadModel {
  const { social } = deps;

  return {
    get isConfigured() {
      return social.isConfigured;
    },

    async load(viewerProfileId: EntityId): Promise<SocialOverview> {
      const [friendships, blocks, partners] = await Promise.all([
        social.listFriendships(viewerProfileId),
        social.listBlocks(viewerProfileId),
        social.listRecentPartners(viewerProfileId).catch(() => []),
      ]);

      const counterpartOf = (edge: FriendshipRecord): EntityId =>
        edge.requesterProfileId === viewerProfileId
          ? edge.addresseeProfileId
          : edge.requesterProfileId;

      const blockedIds = new Set(blocks.map((block) => block.blockedProfileId));

      const accepted = friendships.filter((edge) => edge.status === "accepted");
      const incoming = friendships.filter(
        (edge) => edge.status === "pending" && edge.addresseeProfileId === viewerProfileId,
      );
      const outgoing = friendships.filter(
        (edge) => edge.status === "pending" && edge.requesterProfileId === viewerProfileId,
      );

      // Everyone named anywhere in the social graph, hydrated in one read.
      const directory = await social.hydrateProfiles([
        ...friendships.map(counterpartOf),
        ...blocks.map((block) => block.blockedProfileId),
        ...partners.map((partner) => partner.partnerProfileId),
      ]);

      const view = (edge: FriendshipRecord): SocialPersonView => {
        const otherId = counterpartOf(edge);
        return toPersonView(directory.get(otherId), otherId, edge.id, edge.respondedAt ?? edge.createdAt);
      };

      const friendIds = new Set(accepted.map(counterpartOf));

      return Object.freeze({
        friends: accepted
          .map(view)
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
        incomingRequests: incoming.map(view),
        outgoingRequests: outgoing.map(view),
        blocked: blocks.map((block) => ({
          ...toPersonView(
            directory.get(block.blockedProfileId),
            block.blockedProfileId,
            null,
            block.createdAt,
          ),
          blockedAt: block.createdAt,
        })),
        // A blocked person must never reappear through a projection.
        recentPartners: partners
          .filter((partner) => !blockedIds.has(partner.partnerProfileId))
          .map((partner) => ({
            ...toPersonView(
              directory.get(partner.partnerProfileId),
              partner.partnerProfileId,
              null,
              partner.lastWatchedAt,
            ),
            lastWatchedAt: partner.lastWatchedAt,
            sessionCount: partner.sessionCount,
            isFriend: friendIds.has(partner.partnerProfileId),
          })),
        friendships,
        blocks,
      });
    },
  };
}

export const SOCIAL_READ_MODEL = createServiceToken<SocialReadModel>("SocialReadModel");
