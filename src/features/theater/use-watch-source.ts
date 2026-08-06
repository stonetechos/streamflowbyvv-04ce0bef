/**
 * Watch source hook — Sprint H1.
 *
 * Reads the room's chosen source and, for the host, saves a new one. The
 * Domain owns interpretation and permission; this hook owns pending state.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  WATCH_SOURCE_SERVICE,
  isServiceBound,
  resolveService,
  watchSourceCapability,
  type WatchSource,
  type WatchSourceCapability,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "theater-source";

export interface WatchSourceModel {
  readonly source: WatchSource | null;
  readonly capability: WatchSourceCapability;
  readonly isSaving: boolean;
  readonly error: string | null;
  save(input: string): void;
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

  const [source, setSource] = useState<WatchSource | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localRevision, setLocalRevision] = useState(0);

  useEffect(() => {
    if (!service || !enabled) return;
    let cancelled = false;
    void service
      .read(roomId)
      .then((next) => {
        if (!cancelled) setSource(next);
      })
      .catch((cause: unknown) => {
        logger.warn("source_read_failed", { module: MODULE, roomId, error: String(cause) });
      });
    return () => {
      cancelled = true;
    };
  }, [service, enabled, roomId, revision, localRevision]);

  const save = useCallback(
    (input: string) => {
      if (!service || !profileId || !isHost) return;
      setIsSaving(true);
      setError(null);
      void service
        .set(roomId, profileId, input)
        .then((next) => setSource(next))
        .catch((cause: unknown) => {
          logger.warn("source_save_failed", { module: MODULE, roomId, error: String(cause) });
          setError("invalid");
        })
        .finally(() => setIsSaving(false));
    },
    [service, profileId, isHost, roomId],
  );

  return {
    source,
    capability: watchSourceCapability(source),
    isSaving,
    error,
    save,
    refresh: () => setLocalRevision((value) => value + 1),
  };
}
