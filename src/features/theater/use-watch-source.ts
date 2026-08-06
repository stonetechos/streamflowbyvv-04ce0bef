/**
 * Watch selection hook — Sprint H1, extended in H2.
 *
 * Reads the room's chosen title and, for the host, saves a new one. The
 * Domain owns interpretation and permission; this hook owns pending state.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  WATCH_SOURCE_SERVICE,
  isServiceBound,
  resolveService,
  watchSelectionLabel,
  watchSourceCapability,
  type ProviderCapability,
  type WatchSelection,
  type WatchSource,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "theater-source";

const EMPTY: WatchSelection = { source: null, title: null };

export interface WatchSourceModel {
  readonly selection: WatchSelection;
  readonly source: WatchSource | null;
  /** Host-typed title, or an honest derived label, or null. */
  readonly label: string | null;
  readonly capability: ProviderCapability;
  readonly isSaving: boolean;
  readonly error: string | null;
  save(input: string, title?: string | null): void;
  refresh(): void;
}

export interface UseWatchSourceInput {
  readonly roomId: string;
  readonly profileId: string | null;
  readonly isHost: boolean;
  readonly enabled: boolean;
  /** Bumped by the room's realtime notices so guests pick up a new choice. */
  readonly revision: number;
}

export function useWatchSource({
  roomId,
  profileId,
  isHost,
  enabled,
  revision,
}: UseWatchSourceInput): WatchSourceModel {
  const service = useMemo(
    () => (isServiceBound(WATCH_SOURCE_SERVICE) ? resolveService(WATCH_SOURCE_SERVICE) : null),
    [],
  );

  const [selection, setSelection] = useState<WatchSelection>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localRevision, setLocalRevision] = useState(0);

  useEffect(() => {
    if (!service || !enabled) return;
    let cancelled = false;
    void service
      .read(roomId)
      .then((next) => {
        if (!cancelled) setSelection(next);
      })
      .catch((cause: unknown) => {
        logger.warn("source_read_failed", { module: MODULE, roomId, error: String(cause) });
      });
    return () => {
      cancelled = true;
    };
  }, [service, enabled, roomId, revision, localRevision]);

  const save = useCallback(
    (input: string, title?: string | null) => {
      if (!service || !profileId || !isHost) return;
      setIsSaving(true);
      setError(null);
      void service
        .set(roomId, profileId, input, title ?? null)
        .then((next) => setSelection(next))
        .catch((cause: unknown) => {
          logger.warn("source_save_failed", { module: MODULE, roomId, error: String(cause) });
          setError("invalid");
        })
        .finally(() => setIsSaving(false));
    },
    [service, profileId, isHost, roomId],
  );

  return {
    selection,
    source: selection.source,
    label: watchSelectionLabel(selection),
    capability: watchSourceCapability(selection.source),
    isSaving,
    error,
    save,
    refresh: () => setLocalRevision((value) => value + 1),
  };
}
