/**
 * Coarse wall clock — Milestone D.5.
 *
 * A timestamp that changes on a fixed beat instead of on every render.
 *
 * Relative labels ("last seen 3 minutes ago") need "now", but reading
 * `Date.now()` inside a render made every derived projection a new value on
 * every pass, which in turn re-triggered the memos and effects that consume
 * the roster. This hook gives the same information as a stable value: it only
 * changes when the displayed minute plausibly changed.
 */
import { useEffect, useState } from "react";

/** Default beat. Minute-resolution labels cannot move faster than this. */
const DEFAULT_INTERVAL_MS = 60_000;

export function useCoarseNow(intervalMs: number = DEFAULT_INTERVAL_MS): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
