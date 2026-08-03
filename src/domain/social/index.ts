/**
 * Social domain surface — Milestone F.0.
 * Behaviour and views only; record shapes belong to the Repository contracts.
 */
export {
  createSocialService,
  MAX_RECENT_PARTNERS,
  MAX_SEARCH_RESULTS,
  MIN_SEARCH_TERM_LENGTH,
  SOCIAL_SERVICE,
  type Relationship,
  type RelationshipKind,
  type SocialService,
  type SocialServiceDependencies,
} from "./social-service";
export {
  createSocialReadModel,
  EMPTY_SOCIAL_OVERVIEW,
  SOCIAL_READ_MODEL,
  type BlockedPersonView,
  type RecentPartnerView,
  type SocialOverview,
  type SocialPersonView,
  type SocialReadModel,
  type SocialReadModelDependencies,
} from "./social-read-model";
export type { BlockRecord, DirectoryProfileRecord, FriendshipRecord } from "@/repository";
