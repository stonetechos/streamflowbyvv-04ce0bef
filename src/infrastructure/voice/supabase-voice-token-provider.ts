/**
 * Session-bound voice token provider — Milestone G.
 *
 * The client never holds the LiveKit API secret (Foundation §15). It asks the
 * app's own server endpoint for a short-lived, room-scoped grant and proves
 * who it is with the current backend session token. The secret stays server
 * side; the grant expires on its own.
 */
import { supabase } from "@/integrations/supabase/client";

import type { VoiceGrant, VoiceTokenProvider, VoiceTokenRequest } from "./token-provider";

export const VOICE_TOKEN_PATH = "/api/voice/token";

export class VoiceTokenError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(`Voice token request failed: ${code}`);
    this.name = "VoiceTokenError";
  }
}

export function createSessionVoiceTokenProvider(path = VOICE_TOKEN_PATH): VoiceTokenProvider {
  return {
    async issue(request: VoiceTokenRequest): Promise<VoiceGrant> {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new VoiceTokenError("SF-VOICE-UNAUTHENTICATED", 401);

      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        throw new VoiceTokenError(body.code ?? "SF-VOICE-TOKEN-FAILED", response.status);
      }

      return (await response.json()) as VoiceGrant;
    },
  };
}
