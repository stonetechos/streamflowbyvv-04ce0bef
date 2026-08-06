/**
 * Watch selection hook — Sprint H1, extended in H2, rewritten in H3.
 *
 * The selection itself is shared room state: it arrives with the room
 * snapshot, which every participant re-reads on every realtime notice. This
 * hook therefore reads nothing of its own — it renders the shared reference,
 * and lets the host write a new one. A freshly saved selection is shown
 * immediately and then superseded by the snapshot, so host and guests
 * converge on the same answer rather than on two private ones.
 */
import { useCallback, useEffect, useState } from "react";

import {
  EMPTY_WATCH_SELECTION,
  WATCH_SOURCE_SERVICE,
  isServiceBound,
  mediaRefSelection,
  resolveService,
  watchSelectionLabel,
  watchSourceCapability,
  type RoomMediaRef,
  type WatchProviderCapability,
  type WatchSelection,
  type WatchSource,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "theater-source";

export interface WatchSourceModel {
  readonly selection: WatchSelection;
  readonly source: WatchSource | null;
  /** Host-typed title, or an honest derived label, or null. */
  readonly label: string | null;
  readonly capability: WatchProviderCapability;
  readonly isSaving: boolean;
  readonly error: string | null;
  save(input: string, title?: string | null): void;
}

export interface UseWatchSourceInput {
  readonly roomId: string;
  readonly profileId: string | null;
  readonly isHost: boolean;
  /** The room's shared selection, straight from the room snapshot. */
  readonly mediaRef: RoomMediaRef | null;
}

export function useWatchSource({
  roomId,
  profileId,
  isHost,
  mediaRef,
}: UseWatchSourceInput): WatchSourceModel {
  const shared = mediaRefSelection(mediaRef);
  const [optimistic, setOptimistic] = useState<WatchSelection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once the room snapshot carries the saved choice, the local echo retires.
  useEffect(() => {
    if (optimistic && mediaRef?.url && optimistic.source?.url === mediaRef.url) {
      setOptimistic(null);
    }
  }, [mediaRef, optimistic]);

  const selection = optimistic ?? shared ?? EMPTY_WATCH_SELECTION;

  const save = useCallback(
    (input: string, title?: string | null) => {
      const service = isServiceBound(WATCH_SOURCE_SERVICE)
        ? resolveService(WATCH_SOURCE_SERVICE)
        : null;
      if (!service || !profileId || !isHost) return;
      setIsSaving(true);
      setError(null);
      void service
        .set(roomId, profileId, input, title ?? null)
        .then((next) => setOptimistic(next))
        .catch((cause: unknown) => {
          logger.warn("source_save_failed", { module: MODULE, roomId, error: String(cause) });
          setError("invalid");
        })
        .finally(() => setIsSaving(false));
    },
    [profileId, isHost, roomId],
  );

  return {
    selection,
    source: selection.source,
    label: watchSelectionLabel(selection),
    capability: watchSourceCapability(selection.source),
    isSaving,
    error,
    save,
  };
}
