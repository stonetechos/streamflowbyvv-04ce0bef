/**
 * Profile and settings hook — Milestone E.
 *
 * One loader for the two things every account surface needs: the profile
 * record and the five preference aggregates. Every rule about what a valid
 * handle is, or which aggregate a field belongs to, stays in `ProfileService`
 * (Foundation §2/§3); this hook loads, tracks what is in flight, and re-reads.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PROFILE_SERVICE,
  isServiceBound,
  resolveService,
  type OnboardingCompletion,
  type ProfileRecord,
  type ProfileRecordPatch,
  type ProfileSettingsPatch,
  type ProfileSettingsRecord,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "profiles";

export interface ProfileModel {
  readonly profile: ProfileRecord | null;
  readonly settings: ProfileSettingsRecord | null;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  /** False when no persistence adapter is bound: the screen says so plainly. */
  readonly isAvailable: boolean;
  readonly error: unknown;
  refresh(): void;
  saveProfile(patch: ProfileRecordPatch): Promise<boolean>;
  saveSettings(patch: ProfileSettingsPatch): Promise<boolean>;
  completeOnboarding(completion: OnboardingCompletion): Promise<boolean>;
  isHandleAvailable(handle: string): Promise<boolean>;
  suggestHandle(displayName: string): string;
}

export function useProfile(profileId: string | null): ProfileModel {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [settings, setSettings] = useState<ProfileSettingsRecord | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const service = useMemo(
    () => (isServiceBound(PROFILE_SERVICE) ? resolveService(PROFILE_SERVICE) : null),
    [],
  );

  useEffect(() => {
    if (!service || !profileId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    Promise.all([service.getProfile(profileId), service.getSettings(profileId)])
      .then(([nextProfile, nextSettings]) => {
        if (!active) return;
        setProfile(nextProfile);
        setSettings(nextSettings);
        setError(null);
      })
      .catch((cause: unknown) => {
        logger.warn("Profile load failed", { module: MODULE, error: cause });
        if (active) setError(cause);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profileId, reloadToken, service]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const intent = useCallback(
    () => ({ correlationId: crypto.randomUUID(), actorProfileId: profileId }),
    [profileId],
  );

  const run = useCallback(async (operation: () => Promise<void>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      await operation();
      return true;
    } catch (cause) {
      logger.warn("Profile write failed", { module: MODULE, error: cause });
      setError(cause);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const saveProfile = useCallback(
    async (patch: ProfileRecordPatch) => {
      if (!service || !profileId) return false;
      return run(async () => {
        setProfile(await service.updateProfile(profileId, patch, intent()));
      });
    },
    [intent, profileId, run, service],
  );

  const saveSettings = useCallback(
    async (patch: ProfileSettingsPatch) => {
      if (!service || !profileId) return false;
      return run(async () => {
        setSettings(await service.updateSettings(profileId, patch, intent()));
      });
    },
    [intent, profileId, run, service],
  );

  const completeOnboarding = useCallback(
    async (completion: OnboardingCompletion) => {
      if (!service || !profileId) return false;
      return run(async () => {
        setProfile(await service.completeOnboarding(profileId, completion, intent()));
      });
    },
    [intent, profileId, run, service],
  );

  const isHandleAvailable = useCallback(
    async (handle: string) => {
      if (!service || !profileId) return true;
      try {
        return await service.isHandleAvailable(handle, profileId);
      } catch (cause) {
        logger.warn("Handle check failed", { module: MODULE, error: cause });
        return true;
      }
    },
    [profileId, service],
  );

  const suggestHandle = useCallback(
    (displayName: string) => service?.suggestHandle(displayName) ?? "",
    [service],
  );

  return useMemo(
    () => ({
      profile,
      settings,
      isLoading,
      isSaving,
      isAvailable: service !== null,
      error,
      refresh,
      saveProfile,
      saveSettings,
      completeOnboarding,
      isHandleAvailable,
      suggestHandle,
    }),
    [
      completeOnboarding,
      error,
      isHandleAvailable,
      isLoading,
      isSaving,
      profile,
      refresh,
      saveProfile,
      saveSettings,
      service,
      settings,
      suggestHandle,
    ],
  );
}
