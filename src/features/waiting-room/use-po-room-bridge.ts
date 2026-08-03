/**
 * Po room bridge — Milestone H1 §3.
 *
 * Publishes the live lobby to Po's runtime so its room tools act through the
 * orchestration the Waiting Room already owns, instead of starting a second
 * one. Nothing is decided here: every value and every callback is passed
 * straight through, and the publication is cleared when the screen unmounts so
 * Po honestly reports "you're not in a room".
 */
import { useEffect } from "react";

import { clearPoRoomControls, setPoRoomControls } from "@/features/po/brain/po-runtime";

export interface PoRoomBridgeInput {
  readonly roomId: string;
  readonly roomCode: string;
  readonly roomName: string;
  readonly isHost: boolean;
  readonly isMember: boolean;
  readonly isReady: boolean;
  readonly providerId: string | null;
  readonly memberCount: number;
  readonly readyCount: number;
  readonly countdownSeconds: number;
  readonly countdownState: string;
  readonly canStartCountdown: boolean;
  readonly syncHealth: string;
  readonly voice: {
    readonly isAvailable: boolean;
    readonly isConnected: boolean;
    readonly isMuted: boolean;
  };
  readonly actions: {
    startCountdown(): void;
    cancelCountdown(): void;
    setReady(ready: boolean): void;
    remeasureSync(): void;
    joinVoice(): void;
    leaveVoice(): void;
    setMuted(muted: boolean): void;
    leaveRoom(): void;
  };
}

export function usePoRoomBridge(input: PoRoomBridgeInput | null): void {
  const roomId = input?.roomId ?? null;

  useEffect(() => {
    if (!input) return;
    setPoRoomControls({
      roomId: input.roomId,
      roomCode: input.roomCode,
      roomName: input.roomName,
      isHost: input.isHost,
      isMember: input.isMember,
      isReady: input.isReady,
      providerId: input.providerId,
      memberCount: input.memberCount,
      readyCount: input.readyCount,
      countdownSeconds: input.countdownSeconds,
      countdownState: input.countdownState,
      canStartCountdown: input.canStartCountdown,
      syncHealth: input.syncHealth,
      voice: input.voice,
      ...input.actions,
    });
  }, [input]);

  useEffect(() => {
    if (!roomId) return;
    return () => clearPoRoomControls(roomId);
  }, [roomId]);
}
