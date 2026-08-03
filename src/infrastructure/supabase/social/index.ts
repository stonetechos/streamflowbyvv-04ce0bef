/**
 * Supabase social adapter registration — Milestone F.0.
 *
 * Conditional and idempotent, in the same shape as the identity, room and
 * profile adapters.
 */
import {
  BLOCK_REPOSITORY,
  FRIENDSHIP_REPOSITORY,
  PROFILE_DIRECTORY_REPOSITORY,
  RECENT_PARTNER_READ_REPOSITORY,
  bindRepository,
  isRepositoryBound,
} from "@/repository";

import { getBrowserDataConnection, type DataConnection } from "../connection";
import { createSupabaseBlockRepository } from "./supabase-block-repository";
import { createSupabaseFriendshipRepository } from "./supabase-friendship-repository";
import { createSupabaseProfileDirectoryRepository } from "./supabase-profile-directory-repository";
import { createSupabaseRecentPartnerReadRepository } from "./supabase-recent-partner-repository";

export function registerSupabaseSocialAdapter(connection?: DataConnection): boolean {
  const active = connection ?? getBrowserDataConnection();
  if (!active.isAvailable()) return false;

  if (!isRepositoryBound(FRIENDSHIP_REPOSITORY)) {
    bindRepository(FRIENDSHIP_REPOSITORY, () => createSupabaseFriendshipRepository(active));
  }
  if (!isRepositoryBound(BLOCK_REPOSITORY)) {
    bindRepository(BLOCK_REPOSITORY, () => createSupabaseBlockRepository(active));
  }
  if (!isRepositoryBound(RECENT_PARTNER_READ_REPOSITORY)) {
    bindRepository(RECENT_PARTNER_READ_REPOSITORY, () =>
      createSupabaseRecentPartnerReadRepository(active),
    );
  }
  if (!isRepositoryBound(PROFILE_DIRECTORY_REPOSITORY)) {
    bindRepository(PROFILE_DIRECTORY_REPOSITORY, () =>
      createSupabaseProfileDirectoryRepository(active),
    );
  }
  return true;
}

export { createSupabaseFriendshipRepository } from "./supabase-friendship-repository";
export { createSupabaseBlockRepository } from "./supabase-block-repository";
export { createSupabaseRecentPartnerReadRepository } from "./supabase-recent-partner-repository";
export { createSupabaseProfileDirectoryRepository } from "./supabase-profile-directory-repository";
