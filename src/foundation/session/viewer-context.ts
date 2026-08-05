/**
 * Viewer context — Sprint N (fan-out hardening).
 *
 * Client-side read models are per-profile: `activity_timeline` and
 * `recent_partners` rows are readable and writable only by the profile that
 * owns them. A domain event, however, names every participant, so a naive
 * subscriber tries to write rows for the other people in the room and earns a
 * permission refusal per row. Under four participants that is twelve refused
 * writes on the `RoomEnded` path alone, serialised behind an ordered
 * dispatcher, which is exactly where fan-out latency was being lost.
 *
 * This module holds nothing but the identity of the person this browser tab
 * belongs to, so infrastructure can project only the rows it is allowed to
 * own. It is vendor-neutral and framework-free by design: Foundation may be
 * imported by every layer, so no layering rule is bent to reach it.
 */
let viewerProfileId: string | null = null;

/** Records who this tab belongs to. Called by the auth session boundary. */
export function setViewerProfileId(profileId: string | null): void {
  viewerProfileId = profileId;
}

/** The profile this tab acts as, or null before sign-in. */
export function getViewerProfileId(): string | null {
  return viewerProfileId;
}

/** True when the row belongs to this tab's viewer and may be written here. */
export function isViewerProfile(profileId: string): boolean {
  return viewerProfileId !== null && viewerProfileId === profileId;
}
