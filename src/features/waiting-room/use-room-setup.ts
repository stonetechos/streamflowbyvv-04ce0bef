/**
 * Room setup hook — Sprint 2.2.
 *
 * The host's pre-viewing decisions in the lobby: which provider the room will
 * use and how long the shared countdown will be. Every rule (host-only,
 * selectability, compliance, countdown bounds) lives in `RoomSetupService`;
 * this hook only tracks what is in flight and re-reads afterwards.
 */
import { useCallback, useMemo, useState } from "react";

import {
  ROOM_SETUP_SERVICE,
  isServiceBound,
  normalizeCountdownSeconds,
  resolveService,
} from "@/domain";
import { useProviderCatalog, type ProviderCatalogModel } from "@/features/providers";
import { logger } from "@/foundation/logging";

import { toWaitingRoomError } from "./waiting-room-state";
import type { WaitingRoomError } from "./waiting-room.types";

const MODULE = "waiting-room";

export type RoomSetupPendingAction = "provider" | "countdown" | null;

export interface RoomSetupModel {
  readonly catalog: ProviderCatalogModel;
  readonly pending: RoomSetupPendingAction;
  /** Provider whose selection is being saved, for per-card busy state. */
  readonly pendingProviderId: string | null;
  readonly error: WaitingRoomError | null;
  readonly isAvailable: boolean;
  selectProvider(providerId: string): void;
  setCountdownSeconds(seconds: number): void;
}

export interface UseRoomSetupInput {
  readonly roomId: string;
  readonly actorProfileId: string | null;
  readonly isHost: boolean;
  /** Called after a successful change so the lobby re-reads the room. */
  onChanged(): void;
}

export function useRoomSetup({
  roomId,
  actorProfileId,
  isHost,
  onChanged,
}: UseRoomSetupInput): RoomSetupModel {
  const [pending, setPending] = useState<RoomSetupPendingAction>(null);
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null);
  const [error, setError] = useState<WaitingRoomError | null>(null);

  const catalog = useProviderCatalog(actorProfileId, isHost);
  const setup = useMemo(
    () => (isServiceBound(ROOM_SETUP_SERVICE) ? resolveService(ROOM_SETUP_SERVICE) : null),
    [],
  );

  const run = useCallback(
    async (action: Exclude<RoomSetupPendingAction, null>, operation: () => Promise<unknown>) => {
      setPending(action);
      setError(null);
      try {
        await operation();
        onChanged();
      } catch (cause) {
        logger.warn("Room setup action failed", { module: MODULE, action, roomId, error: cause });
        setError(toWaitingRoomError(cause));
      } finally {
        setPending(null);
        setPendingProviderId(null);
      }
    },
    [onChanged, roomId],
  );

  const selectProvider = useCallback(
    (providerId: string) => {
      if (!setup || !actorProfileId || !isHost) return;
      setPendingProviderId(providerId);
      void run("provider", () =>
        setup.selectProvider(
          { roomId, providerId, actorProfileId },
          { correlationId: crypto.randomUUID(), actorProfileId },
        ),
      );
    },
    [actorProfileId, isHost, roomId, run, setup],
  );

  const setCountdownSeconds = useCallback(
    (seconds: number) => {
      if (!setup || !actorProfileId || !isHost) return;
      void run("countdown", () =>
        setup.setCountdownSeconds(roomId, normalizeCountdownSeconds(seconds), actorProfileId),
      );
    },
    [actorProfileId, isHost, roomId, run, setup],
  );

  return {
    catalog,
    pending,
    pendingProviderId,
    error,
    isAvailable: setup?.isAvailable() ?? false,
    selectProvider,
    setCountdownSeconds,
  };
}
