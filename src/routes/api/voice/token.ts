/**
 * Voice grant endpoint — Milestone G.
 *
 * Mints a short-lived, room-scoped LiveKit access token. This is the only
 * place the LiveKit API secret is ever read, and it never leaves the server
 * (Foundation §15). The token carries no user data beyond the participant
 * identity the caller already owns.
 *
 * Not under `/api/public/`: a grant is issued only to an authenticated caller,
 * verified against the backend's own user endpoint before anything is signed.
 *
 * The JWT is signed with Web Crypto (HS256) rather than a Node-only SDK so the
 * handler runs unchanged in an edge runtime.
 */
import { createFileRoute } from "@tanstack/react-router";

interface GrantRequest {
  roomId?: unknown;
  participantIdentity?: unknown;
  displayName?: unknown;
}

const TOKEN_TTL_SECONDS = 60 * 60;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function base64Url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signAccessToken(input: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name: string;
  room: string;
}): Promise<{ token: string; expiresAt: string }> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL_SECONDS;
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    exp,
    iss: input.apiKey,
    sub: input.identity,
    nbf: now,
    name: input.name,
    video: {
      room: input.room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    },
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(input.apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsigned));
  return {
    token: `${unsigned}.${base64Url(new Uint8Array(signature))}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

async function verifyCaller(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  const accessToken = header?.toLowerCase().startsWith("bearer ") ? header.slice(7) : null;
  if (!accessToken) return null;

  const url = process.env["VITE_SUPABASE_URL"];
  const apiKey = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !apiKey) return null;

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string };
  return user.id ?? null;
}

export const Route = createFileRoute("/api/voice/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LIVEKIT_API_KEY"];
        const apiSecret = process.env["LIVEKIT_API_SECRET"];
        const serverUrl = process.env["LIVEKIT_URL"] ?? process.env["VITE_LIVEKIT_URL"];
        if (!apiKey || !apiSecret || !serverUrl) {
          return json({ code: "SF-VOICE-NOT-CONFIGURED" }, 503);
        }

        const userId = await verifyCaller(request);
        if (!userId) return json({ code: "SF-VOICE-UNAUTHENTICATED" }, 401);

        const body = (await request.json().catch(() => ({}))) as GrantRequest;
        const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";
        const identity =
          typeof body.participantIdentity === "string" ? body.participantIdentity.trim() : "";
        const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
        if (!roomId || !identity) return json({ code: "SF-VOICE-INVALID-REQUEST" }, 400);

        const { token, expiresAt } = await signAccessToken({
          apiKey,
          apiSecret,
          identity,
          name: displayName || identity,
          room: `room-${roomId}`,
        });

        return json({ token, serverUrl, expiresAt }, 200);
      },
    },
  },
});
