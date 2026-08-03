/**
 * Social feature barrel — Milestone F.0.
 *
 * The Presentation layer imports social capability from here and nowhere else,
 * so the friend graph's Domain and Infrastructure remain replaceable.
 */
export { useSocial, type SocialModel } from "./use-social";
export { useUserSearch, type UserSearchModel, type SearchPhase } from "./use-user-search";
export { usePublicProfile, type PublicProfileModel } from "./use-public-profile";
export { PersonRow, type PersonRowProps } from "./components/person-row";
export { FriendActions, type FriendActionsProps } from "./components/friend-actions";
export { FriendLists, type FriendListsProps } from "./components/friend-lists";
export { UserSearchPanel, type UserSearchPanelProps } from "./components/user-search-panel";
export {
  RecentPartnersRail,
  type RecentPartnersRailProps,
} from "./components/recent-partners-rail";
export { HomeSocialRails, type HomeSocialRailsProps } from "./components/home-social-rails";
