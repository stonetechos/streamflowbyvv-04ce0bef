/**
 * Provider capability tiers — Watch Party Engine v2.0, ADR-014.
 *
 * ADR-014 established the feasibility ceiling: StreamFlow cannot start, pause,
 * or seek a premium OTT player, and will never try. What it CAN do differs by
 * provider, and this module is the single place that says which is which.
 *
 *  - Tier A — a real, sanctioned control surface exists (an embeddable player
 *    the member is already entitled to, or a file the member owns).
 *  - Tier B — a deep link plus *observation only* on platforms that expose the
 *    system media session. Observation is never control: StreamFlow may learn
 *    that the host paused; it may not pause anyone.
 *  - Tier C — deep link, countdown, and voice. Everyone presses play on their
 *    own. This is the honest default and covers every premium OTT service.
 *
 * Nothing here grants a capability; it only classifies one. No caller may
 * upgrade a provider by passing a flag — Tier B requires a host runtime that
 * genuinely exposes media-session observation.
 */

export const PROVIDER_TIERS = ["a", "b", "c"] as const;
export type ProviderTier = (typeof PROVIDER_TIERS)[number];

/** Providers with a genuine, permitted control surface. */
const TIER_A_KEYS: ReadonlySet<string> = new Set([
  "youtube",
  "local_file",
  "local",
  "google_drive",
]);

/**
 * Providers where an observation shell could report the host's own play/pause
 * if — and only if — the runtime exposes the system media session.
 */
const TIER_B_CANDIDATE_KEYS: ReadonlySet<string> = new Set([
  "netflix",
  "prime_video",
  "disney_plus",
  "jiohotstar",
  "sonyliv",
  "zee5",
]);

export interface ProviderTierContext {
  /**
   * True only on a runtime that really exposes media-session observation
   * (an Android shell today). Absent or false keeps a candidate at Tier C.
   */
  readonly hasMediaSessionObservation?: boolean;
}

export function providerTier(
  providerKey: string | null | undefined,
  context: ProviderTierContext = {},
): ProviderTier {
  if (!providerKey) return "c";
  const key = providerKey.trim().toLowerCase();
  if (TIER_A_KEYS.has(key)) return "a";
  if (context.hasMediaSessionObservation === true && TIER_B_CANDIDATE_KEYS.has(key)) return "b";
  return "c";
}

export function providerTierLabelKey(tier: ProviderTier): string {
  return `provider.tier.${tier}.label`;
}

/** One plain sentence describing what the room can expect. */
export function providerTierSummaryKey(tier: ProviderTier): string {
  return `provider.tier.${tier}.summary`;
}

/** True when the room's togetherness rests on people, not on machinery. */
export function tierRequiresManualPlay(tier: ProviderTier): boolean {
  return tier !== "a";
}
