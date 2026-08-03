/**
 * Provider launch models — Sprint 2.8, Foundation §11 and §12, MVP Spec §7.
 *
 * The vocabulary for *sending a person to a provider* and nothing more.
 *
 * StreamFlow does not play, control, inspect, embed, proxy, or automate any
 * provider. A launch is a one-way hand-off: the member opens the provider's
 * own app or site, signed in with their own account, and presses play there.
 * These models therefore describe destinations and instructions — never a
 * session, never a credential, never a player handle.
 *
 * Prohibitions encoded here rather than merely documented:
 *  - a target is a public, human-visitable address (app scheme, https page, or
 *    store listing); it is never a media, manifest, licence, or CDN URL;
 *  - no field may carry a cookie, token, password, or provider session;
 *  - `LaunchOutcome` records that StreamFlow *asked* the platform to open a
 *    destination — never that playback started, because that is unknowable.
 */
import type { SyncMode } from "@/domain/shared/domain-enums";

/**
 * How StreamFlow may reach a provider, decided by `ProviderLaunchCoordinator`
 * alone (Sprint 2.8 engineering rule). The four classes the sprint defines:
 *
 *  - `supported`     — remote control is possible in principle (ADR-003
 *                      `controlled`); v1 still launches manually and syncs by
 *                      countdown, so this class changes labels, not behaviour;
 *  - `manual_sync`   — reachable, and every member drives their own player;
 *  - `deep_link`     — reachable only as a link-out with no capability claim;
 *  - `unsupported`   — StreamFlow will not launch it at all.
 */
export const PROVIDER_LAUNCH_CLASSES = [
  "supported",
  "manual_sync",
  "deep_link",
  "unsupported",
] as const;
export type ProviderLaunchClass = (typeof PROVIDER_LAUNCH_CLASSES)[number];

/** Device families that change which destination is tried first. */
export const LAUNCH_PLATFORMS = ["ios", "android", "web", "desktop", "unknown"] as const;
export type LaunchPlatform = (typeof LAUNCH_PLATFORMS)[number];

/**
 * What kind of address a target is. `app` uses the provider's own registered
 * URI scheme, which the operating system resolves — StreamFlow neither knows
 * nor asks whether the app is installed.
 */
export const LAUNCH_TARGET_KINDS = ["app", "web", "store", "homepage"] as const;
export type LaunchTargetKind = (typeof LAUNCH_TARGET_KINDS)[number];

export interface LaunchTarget {
  readonly kind: LaunchTargetKind;
  /** Public address only. Never a media URL and never credential-bearing. */
  readonly url: string;
  /** Translation key describing the destination to a human. */
  readonly labelKey: string;
}

/** Why a provider cannot be launched. Always a value, never an exception. */
export const LAUNCH_REFUSAL_REASONS = [
  "provider_unavailable",
  "compliance_blocked",
  "no_known_destination",
  "missing_content_reference",
  "local_media",
] as const;
export type LaunchRefusalReason = (typeof LAUNCH_REFUSAL_REASONS)[number];

/**
 * The complete, adjudicated answer to "what happens if this member taps
 * Launch". Presentation renders it; it decides nothing further.
 */
export interface ProviderLaunchPlan {
  readonly providerId: string;
  readonly providerKey: string;
  readonly launchClass: ProviderLaunchClass;
  readonly syncMode: SyncMode;
  readonly platform: LaunchPlatform;
  readonly canLaunch: boolean;
  /** Tried first; null whenever `canLaunch` is false. */
  readonly primaryTarget: LaunchTarget | null;
  /** Offered to the member as alternatives — never auto-attempted in turn. */
  readonly fallbackTargets: readonly LaunchTarget[];
  /** Store listing for the provider's own app, when one is known. */
  readonly storeTarget: LaunchTarget | null;
  /** Ordered translation keys telling the member what to do after launching. */
  readonly guidanceKeys: readonly string[];
  /**
   * True whenever the member — not StreamFlow — must press play. In v1 this
   * is every provider without exception (MVP §6, ADR-003).
   */
  readonly requiresManualPlay: boolean;
  readonly refusalReason: LaunchRefusalReason | null;
  /** Translation keys for every restriction that applies, blocking or not. */
  readonly rationaleKeys: readonly string[];
}

/** Where the member is in the hand-off, as far as StreamFlow can honestly tell. */
export const LAUNCH_STATUSES = ["not_launched", "launching", "launched", "failed"] as const;
export type LaunchStatus = (typeof LAUNCH_STATUSES)[number];

/**
 * The result of asking the platform to open a destination.
 *
 * `opened: true` means the request was handed to the browser or operating
 * system — not that the app appeared, not that the title loaded, and above all
 * not that playback began. StreamFlow cannot observe any of those and must
 * never imply that it can.
 */
export interface LaunchOutcome {
  readonly providerId: string;
  readonly target: LaunchTarget;
  readonly opened: boolean;
  readonly requestedAt: string;
}
