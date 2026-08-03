/**
 * ProfileService — Milestone E, Foundation §3.
 *
 * The Domain owner of "who this person is to other people": their name, their
 * handle, their avatar mark, and their preferences. Identity (who is signed
 * in) stays with `SessionService`; this service starts where that one ends.
 *
 * Every mutation publishes through `UserService`, so the event catalogue keeps
 * a single description of profile and preference change (Sprint 1.6) and this
 * service never touches the event bus directly.
 *
 * Repositories resolve lazily, so an unconfigured backend produces an honest
 * unavailable verdict rather than a crash at import time.
 */
import { domainError } from "@/domain/errors/domain-errors";
import {
  isRepositoryBound,
  resolveRepository,
  PROFILE_REPOSITORY,
  PROFILE_SETTINGS_REPOSITORY,
  type EntityId,
  type ProfileRecord,
  type ProfileRecordPatch,
  type ProfileRepository,
  type ProfileSettingsPatch,
  type ProfileSettingsRecord,
  type ProfileSettingsRepository,
  type RepositoryToken,
} from "@/repository";

import { createServiceToken } from "../service-registry";
import type { Intent } from "../services/service-context";
import type { UserService } from "../services/user-service";

/** Handles are lowercase, 3–24 characters, alphanumeric with underscores. */
const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;

export interface OnboardingCompletion {
  readonly displayName: string;
  readonly handle: string;
  readonly avatarPreset: string;
  readonly locale: string;
  readonly timezone: string;
}

export interface ProfileService {
  /** False until a persistence adapter is bound at the composition root. */
  readonly isConfigured: boolean;
  getProfile(profileId: EntityId): Promise<ProfileRecord>;
  /** True when the handle is free, or already belongs to this profile. */
  isHandleAvailable(handle: string, forProfileId: EntityId): Promise<boolean>;
  /** Normalises a display name into a candidate handle. Pure. */
  suggestHandle(displayName: string): string;
  updateProfile(
    profileId: EntityId,
    patch: ProfileRecordPatch,
    intent: Intent,
  ): Promise<ProfileRecord>;
  /** Marks first-run setup complete and writes the values gathered during it. */
  completeOnboarding(
    profileId: EntityId,
    completion: OnboardingCompletion,
    intent: Intent,
  ): Promise<ProfileRecord>;
  getSettings(profileId: EntityId): Promise<ProfileSettingsRecord>;
  updateSettings(
    profileId: EntityId,
    patch: ProfileSettingsPatch,
    intent: Intent,
  ): Promise<ProfileSettingsRecord>;
}

export interface ProfileServiceDependencies {
  readonly users: UserService;
}

function require_<T>(token: RepositoryToken<T>, operation: string): T {
  if (!isRepositoryBound(token)) {
    throw domainError("SERVICE_UNAVAILABLE", { operation });
  }
  return resolveRepository(token);
}

/** The preference table each settings group maps to, for the audit event. */
const PREFERENCE_TABLES: Record<keyof ProfileSettingsPatch, string> = {
  appearance: "appearance_preferences",
  notifications: "notification_preferences",
  privacy: "privacy_preferences",
  localization: "localization_preferences",
  accessibility: "accessibility_preferences",
};

export function createProfileService(deps: ProfileServiceDependencies): ProfileService {
  const { users } = deps;

  const profiles = (operation: string): ProfileRepository =>
    require_(PROFILE_REPOSITORY, operation);
  const settings = (operation: string): ProfileSettingsRepository =>
    require_(PROFILE_SETTINGS_REPOSITORY, operation);

  async function load(profileId: EntityId, operation: string): Promise<ProfileRecord> {
    const record = await profiles(operation).findById(profileId);
    if (!record) {
      throw domainError("PROFILE_NOT_FOUND", { operation, aggregateId: profileId });
    }
    return record;
  }

  return {
    get isConfigured() {
      return isRepositoryBound(PROFILE_REPOSITORY);
    },

    getProfile: (profileId) => load(profileId, "ProfileService.getProfile"),

    suggestHandle(displayName) {
      const base = displayName
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 24);
      return base.length >= 3 ? base : `${base}_watcher`.slice(0, 24);
    },

    async isHandleAvailable(handle, forProfileId) {
      const normalized = handle.trim().toLowerCase();
      if (!HANDLE_PATTERN.test(normalized)) return false;
      const existing = await profiles("ProfileService.isHandleAvailable").findByHandle(normalized);
      return existing === null || existing.id === forProfileId;
    },

    async updateProfile(profileId, patch, intent) {
      const changedFields = Object.keys(patch).filter(
        (key) => patch[key as keyof ProfileRecordPatch] !== undefined,
      );
      if (changedFields.length === 0) {
        return load(profileId, "ProfileService.updateProfile");
      }

      const updated = await profiles("ProfileService.updateProfile").update(profileId, patch);
      await users.updateProfile({ profileId, changedFields }, intent);
      return updated;
    },

    async completeOnboarding(profileId, completion, intent) {
      const handle = completion.handle.trim().toLowerCase();
      if (!HANDLE_PATTERN.test(handle)) {
        throw domainError("INVALID_INPUT", {
          operation: "ProfileService.completeOnboarding",
          aggregateId: profileId,
        });
      }

      const updated = await profiles("ProfileService.completeOnboarding").update(profileId, {
        displayName: completion.displayName.trim(),
        handle,
        avatarPreset: completion.avatarPreset,
        locale: completion.locale,
        timezone: completion.timezone,
        // Server-owned truth for "has this person been set up?", so the
        // decision survives a new device (Session Continuity Rule).
        onboardingCompletedAt: new Date().toISOString(),
      });

      await users.updateProfile(
        {
          profileId,
          changedFields: ["display_name", "handle", "avatar_url", "locale", "timezone"],
        },
        intent,
      );
      return updated;
    },

    getSettings: (profileId) => settings("ProfileService.getSettings").read(profileId),

    async updateSettings(profileId, patch, intent) {
      const groups = (Object.keys(patch) as (keyof ProfileSettingsPatch)[]).filter(
        (group) => patch[group] !== undefined,
      );
      if (groups.length === 0) {
        return settings("ProfileService.updateSettings").read(profileId);
      }

      const result = await settings("ProfileService.updateSettings").write(profileId, patch);

      // One event per aggregate touched: the audit trail should say which
      // preference table changed, not merely that "settings" did.
      for (const group of groups) {
        await users.updatePreferences(
          {
            profileId,
            preferenceTable: PREFERENCE_TABLES[group],
            changedFields: Object.keys(patch[group] ?? {}),
          },
          intent,
        );
      }
      return result;
    },
  };
}

export const PROFILE_SERVICE = createServiceToken<ProfileService>("ProfileService");
