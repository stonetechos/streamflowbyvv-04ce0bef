/**
 * Analytics hooks — Sprint H7.
 *
 * Thin React access to the session store. Components describe what happened;
 * the store decides what is safe to keep and what is a duplicate.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";

import type { AnalyticsEventName } from "@/domain";

import {
  readSnapshot,
  subscribe,
  trackEvent,
  type BetaStoreSnapshot,
  type TrackOptions,
} from "./analytics-store";

export interface AnalyticsModel {
  track(
    name: AnalyticsEventName,
    props?: Readonly<Record<string, unknown>>,
    options?: TrackOptions,
  ): void;
}

export function useAnalytics(defaults: TrackOptions = {}): AnalyticsModel {
  const role = defaults.role ?? "visitor";
  const providerId = defaults.providerId ?? null;
  const syncMode = defaults.syncMode ?? null;
  const roomPhase = defaults.roomPhase ?? null;
  const roomKey = defaults.roomKey ?? null;

  const track = useCallback<AnalyticsModel["track"]>(
    (name, props = {}, options = {}) => {
      trackEvent(name, props, {
        role,
        providerId,
        syncMode,
        roomPhase,
        roomKey,
        ...options,
      });
    },
    [role, providerId, syncMode, roomPhase, roomKey],
  );

  return { track };
}

/** Fires once per mount; the store still deduplicates per session or room. */
export function useTrackOnce(
  name: AnalyticsEventName,
  props: Readonly<Record<string, unknown>> = {},
  options: TrackOptions = {},
): void {
  const analytics = useAnalytics(options);
  useEffect(() => {
    analytics.track(name, props);
    // Intentionally mount-only: repetition is a duplicate, not a new fact.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
}

export function useBetaSnapshot(): BetaStoreSnapshot {
  return useSyncExternalStore(subscribe, readSnapshot, readSnapshot);
}
