/**
 * Public profile hook — Milestone F.0.
 *
 * One directory read for one person. A profile that a block hides simply
 * resolves to null; this hook never distinguishes "hidden" from "gone",
 * because the viewer must not be able to either.
 */
import { useEffect, useMemo, useState } from "react";

import {
  SOCIAL_SERVICE,
  isServiceBound,
  resolveService,
  type DirectoryProfileRecord,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "social";

export interface PublicProfileModel {
  readonly profile: DirectoryProfileRecord | null;
  readonly isLoading: boolean;
  readonly error: unknown;
}

export function usePublicProfile(profileId: string | null): PublicProfileModel {
  const [profile, setProfile] = useState<DirectoryProfileRecord | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const social = useMemo(
    () => (isServiceBound(SOCIAL_SERVICE) ? resolveService(SOCIAL_SERVICE) : null),
    [],
  );

  useEffect(() => {
    if (!social || !profileId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    social
      .getProfile(profileId)
      .then((found: DirectoryProfileRecord | null) => {
        if (!active) return;
        setProfile(found);
        setError(null);
      })
      .catch((cause: unknown) => {
        logger.warn("Profile read failed", { module: MODULE, error: cause });
        if (active) {
          setProfile(null);
          setError(cause);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profileId, social]);

  return { profile, isLoading, error };
}
