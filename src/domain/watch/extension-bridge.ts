/**
 * Extension bridge contract — Sprint H13.
 *
 * The message contract between the StreamFlow page and the MV3 companion
 * extension, plus the pure rules that decide whether the bridge may be
 * trusted. Nothing here touches the DOM, so the contract can be tested and
 * reasoned about on its own.
 *
 * The extension is a transport only. Room authority, revisions, and drift
 * policy remain in the existing sync service (ADR-014 stays binding for any
 * provider the bridge is not actually attached to).
 */
import type { WatchProviderCapability } from "./watch-source";

export const EXTENSION_PROTOCOL_VERSION = 1;
export const EXTENSION_APP_SOURCE = "streamflow-app";
export const EXTENSION_SOURCE = "streamflow-extension";
/** A report older than this is not a live player. */
export const EXTENSION_STALE_AFTER_MS = 6_000;
/** How long the page waits for a bridge answer before calling it missing. */
export const EXTENSION_HANDSHAKE_TIMEOUT_MS = 1_200;
/** The only provider this spike drives. */
export const EXTENSION_PROVIDER_ID = "netflix";

/** A transport command the page asks the extension to apply on this device. */
export type ExtensionCommand =
  | { readonly kind: "play"; readonly positionMs: number }
  | { readonly kind: "pause"; readonly positionMs: number }
  | { readonly kind: "seek"; readonly positionMs: number }
  | { readonly kind: "rate"; readonly rate: number };

/** One observation of the provider's own player, as the content script saw it. */
export interface ExtensionPlayerState {
  readonly provider: string;
  readonly url: string;
  readonly paused: boolean;
  readonly ended: boolean;
  readonly positionMs: number;
  readonly durationMs: number | null;
  readonly rate: number;
  readonly buffering: boolean;
  readonly title: string | null;
  readonly episode: string | null;
  readonly tabId: number;
  readonly observedAtMs: number;
}

export type ExtensionInboundMessage =
  | { readonly kind: "installed"; readonly version: string }
  | {
      readonly kind: "ready" | "state";
      readonly hasPlayerTab: boolean;
      readonly state?: ExtensionPlayerState | null;
    }
  | { readonly kind: "ack"; readonly id: string | null; readonly delivered: boolean }
  | { readonly kind: "gone" };

/** How far the page has got with the companion extension. */
export type ExtensionLinkStatus = "checking" | "missing" | "installed" | "connected";

/** True when `value` is a well-formed message from our own extension. */
export function isExtensionMessage(value: unknown): value is ExtensionInboundMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record["source"] !== EXTENSION_SOURCE) return false;
  if (record["v"] !== EXTENSION_PROTOCOL_VERSION) return false;
  return typeof record["kind"] === "string";
}

/** True when a report is recent enough to act on. */
export function isPlayerStateFresh(
  state: ExtensionPlayerState | null,
  nowMs: number,
  staleAfterMs: number = EXTENSION_STALE_AFTER_MS,
): boolean {
  if (!state) return false;
  const age = nowMs - state.observedAtMs;
  return age >= 0 ? age <= staleAfterMs : true;
}

/**
 * The single rule for "may this room drive the provider right now?".
 * Anything less than a fresh report from an attached player is a no, and the
 * room falls back to manual coordination without pretending otherwise.
 */
export function isBridgeControllable(input: {
  readonly status: ExtensionLinkStatus;
  readonly providerId: string | null;
  readonly state: ExtensionPlayerState | null;
  readonly nowMs: number;
}): boolean {
  if (input.status !== "connected") return false;
  if (input.providerId !== EXTENSION_PROVIDER_ID) return false;
  return isPlayerStateFresh(input.state, input.nowMs);
}

/**
 * Upgrades a launch-only capability to a driven one, and only while the bridge
 * is genuinely attached. The claims on screen change with the same switch that
 * changes the behaviour, so the room can never overclaim.
 */
export function withExtensionControl(
  capability: WatchProviderCapability,
  isControllable: boolean,
): WatchProviderCapability {
  if (!isControllable) return capability;
  if (capability.playbackControlMode === "automatic") return capability;
  return Object.freeze({
    ...capability,
    playbackControlMode: "automatic" as const,
    limitations: Object.freeze([
      `StreamFlow drives ${capability.displayName} through the companion extension on your own device.`,
      `Everyone needs their own ${capability.displayName} account, signed in on this browser.`,
      "Fullscreen belongs to the provider's own player.",
    ]),
  });
}
