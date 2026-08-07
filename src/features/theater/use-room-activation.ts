/**
 * Room activation hook — Sprint H7.
 *
 * Turns the room the viewer is actually in into a single next step. The hook
 * owns no state of its own: every input is a fact the room already published.
 */
import { useMemo } from "react";

import { deriveActivationPlan, type ActivationInput, type ActivationPlan } from "@/domain";

export function useRoomActivation(input: ActivationInput): ActivationPlan {
  return useMemo(
    () => deriveActivationPlan(input),
    // Primitives only: a stable plan for a stable room.
    [
      input.isHost,
      input.guestCount,
      input.hasContent,
      input.isCountingDown,
      input.phase,
      input.isEmbedded,
      input.hasOpenedProvider,
      input.isSelfReady,
      input.isVoiceConnected,
      input.isVoiceAvailable,
    ],
  );
}
