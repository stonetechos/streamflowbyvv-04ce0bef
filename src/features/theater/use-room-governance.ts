/**
 * Room governance hook — Sprint H6.
 *
 * Carries the room's privacy and moderation settings to Presentation and turns
 * a host's tap into an authorized Domain call. It decides nothing: every
 * permission answer comes from `canPerform`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_GOVERNANCE,
  ROOM_GOVERNANCE_SERVICE,
  canPerform,
  isServiceBound,
  resolveService,
  seatRole,
  type MembershipState,
  type ModerationAction,
  type PermissionContext,
  type RoomGovernanceSettings,
  type RoomRole,
  type RoomSeatRole,
  type RoomStatus,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "room-governance";

export type GovernancePending =
  | "lock"
  | "chat"
  | "close"
  | "invite"
  | "mute"
  | "remove"
  | "playback"
  | null;

export interface RoomGovernanceModel {
  readonly isAvailable: boolean;
  readonly settings: RoomGovernanceSettings;
  readonly seat: RoomSeatRole;
  readonly pending: GovernancePending;
  readonly error: string | null;
  can(action: ModerationAction): boolean;
  setLocked(locked: boolean): void;
  setChatEnabled(enabled: boolean): void;
  setPlaybackLocked(locked: boolean): void;
  setInviteActive(active: boolean): void;
  setInviteExpiry(iso: string | null): void;
  closeRoom(): void;
  muteParticipant(memberId: string, muted: boolean): void;
  removeParticipant(memberId: string): void;
  refresh(): void;
}

export interface UseRoomGovernanceInput {
  readonly roomId: string;
  readonly enabled: boolean;
  readonly viewerRole: RoomRole;
  readonly viewerState: MembershipState;
  readonly viewerMutedByHost: boolean;
  readonly roomStatus: RoomStatus;
  /** Settings as they arrive on the shared room snapshot, when present. */
  readonly snapshotSettings?: RoomGovernanceSettings | null;
  onChanged?(): void;
  onModeration?(action: ModerationAction): void;
}

export function useRoomGovernance(input: UseRoomGovernanceInput): RoomGovernanceModel {
  const service = useMemo(
    () => (isServiceBound(ROOM_GOVERNANCE_SERVICE) ? resolveService(ROOM_GOVERNANCE_SERVICE) : null),
    [],
  );
  const [settings, setSettings] = useState<RoomGovernanceSettings>(
    input.snapshotSettings ?? DEFAULT_GOVERNANCE,
  );
  const [pending, setPending] = useState<GovernancePending>(null);
  const [error, setError] = useState<string | null>(null);

  const seat = seatRole({
    role: input.viewerRole,
    state: input.viewerState,
    isMutedByHost: input.viewerMutedByHost,
  });

  const context: PermissionContext = useMemo(
    () => ({ seat, settings, roomStatus: input.roomStatus }),
    [seat, settings, input.roomStatus],
  );

  const refresh = useCallback(() => {
    if (!service || !input.enabled) return;
    void service
      .load(input.roomId)
      .then(setSettings)
      .catch((cause: unknown) => {
        logger.debug("governance_load_failed", { module: MODULE, error: String(cause) });
      });
  }, [service, input.enabled, input.roomId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (input.snapshotSettings) setSettings(input.snapshotSettings);
  }, [input.snapshotSettings]);

  const run = useCallback(
    (
      action: ModerationAction,
      slot: Exclude<GovernancePending, null>,
      operation: () => Promise<unknown>,
    ) => {
      if (!service) return;
      if (!canPerform(action, context)) {
        setError("forbidden");
        return;
      }
      setError(null);
      setPending(slot);
      void operation()
        .then(() => {
          input.onModeration?.(action);
          input.onChanged?.();
          refresh();
        })
        .catch((cause: unknown) => {
          logger.warn("moderation_failed", { module: MODULE, action, error: String(cause) });
          setError("failed");
        })
        .finally(() => setPending(null));
    },
    [service, context, refresh, input],
  );

  const patch = useCallback(
    (
      action: ModerationAction,
      slot: Exclude<GovernancePending, null>,
      change: Partial<RoomGovernanceSettings>,
    ) => {
      run(action, slot, async () => {
        if (!service) return;
        const next = await service.applySettings({
          roomId: input.roomId,
          action,
          context,
          patch: change,
        });
        setSettings(next);
      });
    },
    [run, service, input.roomId, context],
  );

  return {
    isAvailable: service?.isAvailable() ?? false,
    settings,
    seat,
    pending,
    error,
    can: (action) => canPerform(action, context),
    setLocked: (locked) =>
      patch(locked ? "lock_room" : "unlock_room", "lock", { isLocked: locked }),
    setChatEnabled: (enabled) =>
      patch(enabled ? "enable_chat" : "disable_chat", "chat", { isChatEnabled: enabled }),
    setPlaybackLocked: (locked) =>
      patch("lock_playback", "playback", { isPlaybackLocked: locked }),
    setInviteActive: (active) => patch("lock_room", "invite", { isInviteActive: active }),
    setInviteExpiry: (iso) => patch("lock_room", "invite", { inviteExpiresAt: iso }),
    closeRoom: () =>
      run("close_room", "close", async () => {
        if (service) await service.closeRoom({ roomId: input.roomId, context });
      }),
    muteParticipant: (memberId, muted) =>
      run(muted ? "mute_participant" : "unmute_participant", "mute", async () => {
        if (service) await service.setParticipantMuted({ memberId, muted, context });
      }),
    removeParticipant: (memberId) =>
      run("remove_participant", "remove", async () => {
        if (service) await service.removeParticipant({ memberId, context });
      }),
    refresh,
  };
}
