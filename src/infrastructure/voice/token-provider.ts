/**
 * Voice token provider — Sprint 1.1 §5.
 *
 * Voice tokens are minted server-side from the LiveKit API secret; the secret
 * must never reach a client bundle (Foundation §15). The client only ever holds
 * a short-lived, room-scoped token, so this is an interface plus an HTTP-backed
 * implementation that calls a server endpoint — the endpoint itself is NOT part
 * of Sprint 1.1.
 */
import type { HttpClient } from "@/infrastructure/http";

export interface VoiceTokenRequest {
  readonly roomId: string;
  readonly participantIdentity: string;
  readonly displayName: string;
}

export interface VoiceGrant {
  readonly token: string;
  readonly serverUrl: string;
  readonly expiresAt: string;
}

export interface VoiceTokenProvider {
  issue(request: VoiceTokenRequest): Promise<VoiceGrant>;
}

/** Calls the server endpoint that mints grants. Holds no secret itself. */
export function createHttpVoiceTokenProvider(
  http: HttpClient,
  path = "/voice/token",
): VoiceTokenProvider {
  return {
    async issue(request) {
      const response = await http.post<VoiceGrant>(path, request);
      return response.body;
    },
  };
}
