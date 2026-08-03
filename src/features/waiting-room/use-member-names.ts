/**
 * Member display names — Sprint J.1.
 *
 * The lobby must show people, not identifiers. Profile records exist now, so
 * the roster resolves each member's display name through `ProfileService` and
 * only falls back to the short code stand-in while a name is still loading or
 * when the profile is not visible to this viewer (a block, for example).
 *
 * Reads only. No membership, sync, or readiness rule lives here.
 */
import { useEffect, useMemo, useRef, useState } from "react";

import { PROFILE_SERVICE, isServiceBound, resolveService } from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "waiting-room";

const EMPTY: ReadonlyMap<string, string> = new Map();

/** Resolves display names for the given profile ids, cached across renders. */
export function useMemberNames(profileIds: readonly string[]): ReadonlyMap<string, string> {
  const [names, setNames] = useState<ReadonlyMap<string, string>>(EMPTY);
  const requested = useRef<Set<string>>(new Set());

  // A stable key so a re-rendered roster of the same people does not refetch.
  const key = useMemo(() => [...profileIds].sort().join(","), [profileIds]);

  useEffect(() => {
    if (!isServiceBound(PROFILE_SERVICE)) return;
    const missing = key.split(",").filter((id) => id.length > 0 && !requested.current.has(id));
    if (missing.length === 0) return;

    let active = true;
    for (const id of missing) requested.current.add(id);

    const profiles = resolveService(PROFILE_SERVICE);
    void Promise.all(
      missing.map(async (id) => {
        try {
          const profile = await profiles.getProfile(id);
          return [id, profile.displayName] as const;
        } catch (error) {
          // A name we may not read is not an error the lobby should surface.
          logger.debug("member name unavailable", { module: MODULE, profileId: id });
          requested.current.delete(id);
          return null;
        }
      }),
    ).then((resolved) => {
      if (!active) return;
      const found = resolved.filter((entry): entry is readonly [string, string] => entry !== null);
      if (found.length === 0) return;
      setNames((previous) => {
        const next = new Map(previous);
        for (const [id, name] of found) next.set(id, name);
        return next;
      });
    });

    return () => {
      active = false;
    };
  }, [key]);

  return names;
}
