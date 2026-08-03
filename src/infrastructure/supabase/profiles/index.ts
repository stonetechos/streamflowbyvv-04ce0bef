/**
 * Supabase profile adapter registration — Milestone E.
 *
 * Conditional and idempotent, in the same shape as the identity and room
 * adapters: with no configured backend nothing is bound, and Domain reports an
 * honest unavailable verdict instead of crashing.
 */
import {
  PROFILE_REPOSITORY,
  PROFILE_SETTINGS_REPOSITORY,
  bindRepository,
  isRepositoryBound,
} from "@/repository";

import { getBrowserDataConnection, type DataConnection } from "../connection";
import { createSupabaseProfileRepository } from "./supabase-profile-repository";
import { createSupabaseProfileSettingsRepository } from "./supabase-profile-settings-repository";

export function registerSupabaseProfileAdapter(connection?: DataConnection): boolean {
  const active = connection ?? getBrowserDataConnection();
  if (!active.isAvailable()) return false;

  if (!isRepositoryBound(PROFILE_REPOSITORY)) {
    bindRepository(PROFILE_REPOSITORY, () => createSupabaseProfileRepository(active));
  }
  if (!isRepositoryBound(PROFILE_SETTINGS_REPOSITORY)) {
    bindRepository(PROFILE_SETTINGS_REPOSITORY, () =>
      createSupabaseProfileSettingsRepository(active),
    );
  }
  return true;
}

export { createSupabaseProfileRepository } from "./supabase-profile-repository";
export { createSupabaseProfileSettingsRepository } from "./supabase-profile-settings-repository";
export { PROFILE_COLUMNS, toProfileRecord, type ProfileRow } from "./profile-mapper";
