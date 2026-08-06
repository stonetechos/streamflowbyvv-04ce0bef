/**
 * Multi-identity certification fixture — WP1 (T3).
 *
 * Ten of the fourteen M1 rows need two to eight concurrent identities in one
 * room, and several need those identities present in a real browser rather
 * than only on the Data API. This module provides both, on top of the existing
 * `fixtures/backend.ts` publishable-key client. No privileged key is used: a
 * certification identity may only do what a real user can do.
 *
 * Nothing here changes product behaviour. Rooms and memberships are created
 * through the same tables and the same RLS the application is subject to.
 *
 * Traceability: WP1 task T3 in `docs/m1/M1-Backlog.md`; prerequisite ranked
 * first in `docs/m1/M1.1-Certification-Harness-Discovery.md` §6.
 */
import type { Browser, BrowserContext, Page } from "@playwright/test";

import {
  backendConfigured,
  createCertRoom,
  profileIdFor,
  provisionIdentity,
  SUPABASE_URL,
  type CertIdentity,
} from "./backend";

export interface CertParticipant {
  readonly label: string;
  readonly identity: CertIdentity;
  readonly profileId: string;
}

export interface CertRoom {
  readonly id: string;
  readonly code: string;
  readonly maxMembers: number;
}

/** The localStorage key the browser Supabase client reads its session from. */
export function authStorageKey(): string {
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0] ?? "unknown";
  return `sb-${ref}-auth-token`;
}

/**
 * Provisions `count` identities in parallel and resolves each one's profile.
 * Returns null when the environment cannot provision them — the caller must
 * then record `unmeasured`, never a pass.
 */
export async function provisionParticipants(
  count: number,
  labelPrefix: string,
): Promise<readonly CertParticipant[] | null> {
  if (!backendConfigured) return null;
  const provisioned = await Promise.all(
    Array.from({ length: count }, async (_unused, index) => {
      const label = `${labelPrefix}${index}`;
      const identity = await provisionIdentity(label);
      if (!identity) return null;
      const profileId = await profileIdFor(identity);
      if (!profileId) return null;
      return { label, identity, profileId } satisfies CertParticipant;
    }),
  );
  if (provisioned.some((entry) => entry === null)) return null;
  return provisioned as readonly CertParticipant[];
}

/** Creates a lobby owned by `host` with an explicit capacity (schema allows 2–8). */
export async function createRoomWithCapacity(
  host: CertParticipant,
  maxMembers: number,
  name = "M1 certification room",
): Promise<CertRoom | null> {
  const created = await createCertRoom(host.identity, host.profileId, name);
  if (!created) return null;
  const { data } = await host.identity.client
    .from("rooms")
    .update({ max_members: maxMembers })
    .eq("id", created.id)
    .select("id, code, max_members")
    .maybeSingle();
  if (!data) return null;
  return {
    id: data["id"] as string,
    code: data["code"] as string,
    maxMembers: data["max_members"] as number,
  };
}

/** Records the host's own membership row, the way the room-creation flow does. */
export async function seatHost(host: CertParticipant, room: CertRoom): Promise<boolean> {
  const { error } = await host.identity.client.from("room_members").insert({
    room_id: room.id,
    profile_id: host.profileId,
    role: "host",
    state: "joined",
    joined_at: new Date().toISOString(),
  });
  return error === null;
}

export interface JoinOutcome {
  readonly accepted: boolean;
  readonly message: string;
}

/**
 * A guest seats itself, which is exactly the privilege RLS grants a real guest
 * (`room_members_insert_host_or_self`, role `guest`). Capacity is NOT asserted
 * here: whether the platform refuses an over-capacity seat is the subject of
 * CERT-ROOM-03, not an assumption of the fixture.
 */
export async function joinAsGuest(
  participant: CertParticipant,
  room: CertRoom,
): Promise<JoinOutcome> {
  const { error } = await participant.identity.client.from("room_members").insert({
    room_id: room.id,
    profile_id: participant.profileId,
    role: "guest",
    state: "joined",
    joined_at: new Date().toISOString(),
  });
  return { accepted: error === null, message: error?.message ?? "seated" };
}

export async function leaveRoom(participant: CertParticipant, room: CertRoom): Promise<boolean> {
  const { data } = await participant.identity.client
    .from("room_members")
    .update({ state: "left", left_at: new Date().toISOString() })
    .eq("room_id", room.id)
    .eq("profile_id", participant.profileId)
    .select("id");
  return (data ?? []).length > 0;
}

/** Readiness is member metadata (`waiting_room_ready`), per src/domain/rooms/room-read-model.ts. */
export async function setReadiness(
  participant: CertParticipant,
  room: CertRoom,
  ready: boolean,
): Promise<boolean> {
  const { data } = await participant.identity.client
    .from("room_members")
    .update({ metadata: { waiting_room_ready: ready } })
    .eq("room_id", room.id)
    .eq("profile_id", participant.profileId)
    .select("id");
  return (data ?? []).length > 0;
}

export interface RosterEntry {
  readonly profileId: string;
  readonly role: string;
  readonly state: string;
  readonly ready: boolean;
}

/** The roster as one participant can see it. Peer visibility is the measurement. */
export async function readRoster(
  viewer: CertParticipant,
  room: CertRoom,
): Promise<readonly RosterEntry[]> {
  const { data } = await viewer.identity.client
    .from("room_members")
    .select("profile_id, role, state, metadata")
    .eq("room_id", room.id);
  return (data ?? []).map((row) => ({
    profileId: row["profile_id"] as string,
    role: row["role"] as string,
    state: row["state"] as string,
    ready: (row["metadata"] as Record<string, unknown> | null)?.["waiting_room_ready"] === true,
  }));
}

export interface SignedInSession {
  readonly context: BrowserContext;
  readonly page: Page;
}

/**
 * Opens a browser context already carrying `participant`'s session, so a spec
 * can drive an authenticated surface without automating the sign-in form.
 * Returns null when the identity has no live session to transplant.
 */
export async function signedInContext(
  browser: Browser,
  participant: CertParticipant,
  baseURL: string,
  options: { readonly reducedMotion?: "reduce" | "no-preference" } = {},
): Promise<SignedInSession | null> {
  const { data } = await participant.identity.client.auth.getSession();
  if (!data.session) return null;
  const context = await browser.newContext(
    options.reducedMotion ? { reducedMotion: options.reducedMotion } : {},
  );
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key!, value!),
    [authStorageKey(), JSON.stringify(data.session)],
  );
  return { context, page };
}

/** Best-effort teardown. Rooms carry a soft-delete column; memberships do not. */
export async function disposeRoom(host: CertParticipant, room: CertRoom): Promise<void> {
  await host.identity.client
    .from("rooms")
    .update({ deleted_at: new Date().toISOString(), status: "ended" })
    .eq("id", room.id);
}
