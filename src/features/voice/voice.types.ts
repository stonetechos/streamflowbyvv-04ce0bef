/**
 * Voice feature view models — Milestone G.
 *
 * Presentation-shaped projections of the transport's state. Nothing here
 * mentions a vendor, and nothing here decides anything.
 */
import type { VoiceQuality } from "@/infrastructure/voice";

/** What the UI shows. `unavailable` means no transport or no grant source. */
export type VoiceUiState =
  "unavailable" | "idle" | "connecting" | "connected" | "reconnecting" | "error";

export interface VoiceMemberView {
  /** The participant identity is the profile id (Foundation §6). */
  readonly profileId: string;
  readonly displayName: string;
  readonly isSpeaking: boolean;
  readonly isMuted: boolean;
  readonly isSelf: boolean;
}

export interface VoiceError {
  readonly code: string;
  readonly messageKey: string;
}

export type VoicePendingAction = "join" | "leave" | "mute" | "deafen" | null;

export const VOICE_QUALITY_KEYS: Readonly<Record<VoiceQuality, string>> = {
  excellent: "voice.quality.excellent",
  good: "voice.quality.good",
  poor: "voice.quality.poor",
  unknown: "voice.quality.unknown",
};

export const VOICE_STATE_KEYS: Readonly<Record<VoiceUiState, string>> = {
  unavailable: "voice.state.unavailable",
  idle: "voice.state.idle",
  connecting: "voice.state.connecting",
  connected: "voice.state.connected",
  reconnecting: "voice.state.reconnecting",
  error: "voice.state.error",
};

/** Maps a transport failure onto a stable, user-facing code. */
export function toVoiceError(cause: unknown): VoiceError {
  const code =
    typeof cause === "object" && cause !== null && "code" in cause
      ? String((cause as { code: unknown }).code)
      : "SF-VOICE-CONNECT-FAILED";

  if (code === "SF-VOICE-NOT-CONFIGURED") {
    return { code, messageKey: "voice.error.not_configured" };
  }
  if (code === "SF-VOICE-UNAUTHENTICATED") {
    return { code, messageKey: "voice.error.unauthenticated" };
  }
  return { code, messageKey: "voice.error.connect_failed" };
}
