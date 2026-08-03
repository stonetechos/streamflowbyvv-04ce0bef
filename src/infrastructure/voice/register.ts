/**
 * Voice infrastructure registration — Milestone G.
 *
 * Binds the LiveKit transport and the grant provider to the neutral seams the
 * feature layer resolves. Browser only: the SDK is a client transport and the
 * SSR pass must never construct one.
 */
import { logger } from "@/foundation/logging";

import { createLiveKitVoiceAdapter } from "./livekit-voice-adapter";
import { createSessionVoiceTokenProvider } from "./supabase-voice-token-provider";
import type { VoiceTokenProvider } from "./token-provider";
import { isVoiceAvailable, registerVoiceAdapter } from "./voice-registry";

let tokenProvider: VoiceTokenProvider | null = null;

export function registerVoiceInfrastructure(): boolean {
  if (typeof window === "undefined") return false;
  if (isVoiceAvailable()) return true;

  registerVoiceAdapter("livekit", createLiveKitVoiceAdapter);
  tokenProvider = createSessionVoiceTokenProvider();
  logger.debug("Voice transport registered", { module: "voice" });
  return true;
}

/** Null until registration has run (or on the server). */
export function resolveVoiceTokenProvider(): VoiceTokenProvider | null {
  return tokenProvider;
}
