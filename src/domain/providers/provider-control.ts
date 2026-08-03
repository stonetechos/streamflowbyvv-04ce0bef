/**
 * Provider control abstraction — Sprint K.1.
 *
 * The single place that answers "what can StreamFlow actually do with this
 * provider on this device?". Three implementations exist so the honest answer
 * is a type, not a comment:
 *
 *  - `BrowserProviderControl`     — what the web app can really do today:
 *                                   launch, deep link, manual synchronization,
 *                                   and NO remote playback control;
 *  - `NativeProviderControl`      — the seat reserved for a future native
 *                                   integration. It ships disabled: remote
 *                                   control is reported as *planned*, never as
 *                                   available, because nothing implements it;
 *  - `UnsupportedProviderControl` — StreamFlow will not drive this provider at
 *                                   all.
 *
 * Prohibitions encoded here rather than merely documented: no implementation
 * may return `canRemoteControl: true` without a real, compliant integration,
 * no implementation holds a credential or provider session, and none of them
 * inspect, embed, proxy, or automate a provider's player.
 */

export const PROVIDER_CONTROL_MODES = ["browser", "native", "unsupported"] as const;
export type ProviderControlMode = (typeof PROVIDER_CONTROL_MODES)[number];

/** How a capability stands today. `planned` is never a claim of behaviour. */
export const CONTROL_CAPABILITY_STATES = ["available", "planned", "unavailable"] as const;
export type ControlCapabilityState = (typeof CONTROL_CAPABILITY_STATES)[number];

export interface ProviderControlCapabilities {
  /** Hand the member off to the provider's own app or site. */
  readonly launch: ControlCapabilityState;
  /** Open a specific title rather than the provider's front door. */
  readonly deepLink: ControlCapabilityState;
  /** Countdown-coordinated manual play, the v1 synchronization model. */
  readonly manualSync: ControlCapabilityState;
  /** Start, pause, or seek on the member's behalf. Never `available` in v1. */
  readonly remoteControl: ControlCapabilityState;
  /** Read the provider's real playback position. Not possible from the web. */
  readonly playbackObservation: ControlCapabilityState;
}

/** What a control refuses, and why, in the member's language. */
export interface ProviderControlRefusal {
  readonly reasonKey: string;
}

export interface ProviderControl {
  readonly mode: ProviderControlMode;
  readonly capabilities: ProviderControlCapabilities;
  /** Translation key naming the playback mode for this control. */
  readonly playbackModeKey: string;
  /** Always refuses in v1: no implementation can control a provider's player. */
  requestRemoteControl(): ProviderControlRefusal;
}

function freezeCapabilities(
  capabilities: ProviderControlCapabilities,
): ProviderControlCapabilities {
  return Object.freeze({ ...capabilities });
}

/**
 * The web application, told truthfully: it can point a person at their
 * provider and keep everyone counting down together — nothing more.
 */
export function createBrowserProviderControl(
  options: { readonly canDeepLink?: boolean } = {},
): ProviderControl {
  return Object.freeze({
    mode: "browser" as const,
    capabilities: freezeCapabilities({
      launch: "available",
      deepLink: options.canDeepLink === false ? "unavailable" : "available",
      manualSync: "available",
      remoteControl: "unavailable",
      playbackObservation: "unavailable",
    }),
    playbackModeKey: "provider.playback_mode.manual_sync",
    requestRemoteControl: () => ({ reasonKey: "provider.control.refusal.browser" }),
  });
}

/**
 * Reserved for a future, provider-sanctioned native integration. It exists so
 * callers can be written against the eventual capability today; it grants
 * nothing, and its remote control stays `planned` until such an integration
 * genuinely ships.
 */
export function createNativeProviderControl(): ProviderControl {
  return Object.freeze({
    mode: "native" as const,
    capabilities: freezeCapabilities({
      launch: "available",
      deepLink: "available",
      manualSync: "available",
      remoteControl: "planned",
      playbackObservation: "planned",
    }),
    playbackModeKey: "provider.playback_mode.future_native",
    requestRemoteControl: () => ({ reasonKey: "provider.control.refusal.native_planned" }),
  });
}

/** StreamFlow will not launch or drive this provider. */
export function createUnsupportedProviderControl(): ProviderControl {
  return Object.freeze({
    mode: "unsupported" as const,
    capabilities: freezeCapabilities({
      launch: "unavailable",
      deepLink: "unavailable",
      manualSync: "unavailable",
      remoteControl: "unavailable",
      playbackObservation: "unavailable",
    }),
    playbackModeKey: "provider.playback_mode.unsupported",
    requestRemoteControl: () => ({ reasonKey: "provider.control.refusal.unsupported" }),
  });
}

export interface ProviderControlSelection {
  /** True when the provider may be chosen at all (Domain's verdict). */
  readonly isSelectable: boolean;
  /** True when a concrete destination exists for this provider. */
  readonly canDeepLink: boolean;
  /**
   * True on a native shell (Capacitor). It only changes which control is
   * chosen; the native control still grants no remote control today.
   */
  readonly isNativeRuntime?: boolean;
}

/** Chooses the honest control for a provider on this runtime. */
export function selectProviderControl(selection: ProviderControlSelection): ProviderControl {
  if (!selection.isSelectable) return createUnsupportedProviderControl();
  if (selection.isNativeRuntime === true) return createNativeProviderControl();
  return createBrowserProviderControl({ canDeepLink: selection.canDeepLink });
}
