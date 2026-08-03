/**
 * Provider sessions — Sprint K.1.
 *
 * Each supported provider owns an independent session. A "session" here is
 * emphatically NOT an authenticated session with the provider: StreamFlow
 * never sees, brokers, or stores provider credentials, cookies, or tokens
 * (Foundation §10, §11). It records exactly two facts, both supplied by the
 * member's own actions inside StreamFlow:
 *
 *  - that this person has connected the provider at least once, meaning they
 *    confirmed they signed in with that provider normally, in the provider's
 *    own app or site;
 *  - when they last used it, so the shelf can order itself sensibly.
 *
 * Everything else on a session is derived: the display name comes from the
 * catalog, and the capabilities come from `ProviderControl` — never from a
 * guess made in Presentation.
 */
import {
  selectProviderControl,
  type ProviderControl,
  type ProviderControlMode,
} from "./provider-control";

/** Connection status as the member experiences it. */
export const PROVIDER_SESSION_STATUSES = ["connected", "not_connected", "unavailable"] as const;
export type ProviderSessionStatus = (typeof PROVIDER_SESSION_STATUSES)[number];

/**
 * The only thing persisted per provider, device-locally. Credential material
 * is structurally impossible: the record has nowhere to put it.
 */
export interface ProviderConnectionRecord {
  readonly providerKey: string;
  /** When the member first confirmed they signed in with this provider. */
  readonly connectedAt: string;
  /** When they last started a room with it. */
  readonly lastUsedAt: string | null;
}

export interface ProviderSession {
  readonly providerKey: string;
  /** Catalog id when StreamFlow knows this provider, else null. */
  readonly providerId: string | null;
  readonly displayName: string;
  readonly status: ProviderSessionStatus;
  /**
   * When the member last authenticated with the provider *as far as
   * StreamFlow was told*. StreamFlow cannot verify a provider session.
   */
  readonly lastAuthenticatedAt: string | null;
  readonly lastUsedAt: string | null;
  readonly controlMode: ProviderControlMode;
  readonly control: ProviderControl;
  /** True when StreamFlow can hand the member off to this provider. */
  readonly canLaunch: boolean;
  /** True when countdown-coordinated manual play applies. */
  readonly supportsManualSync: boolean;
  /** True only when remote control is a *planned* future capability. */
  readonly hasFutureControl: boolean;
}

export interface ProviderSessionInput {
  readonly providerKey: string;
  readonly providerId: string | null;
  readonly displayName: string;
  /** Domain's verdict on whether the provider may be chosen at all. */
  readonly isSelectable: boolean;
  readonly supportsDeepLink: boolean;
  readonly isNativeRuntime?: boolean;
  readonly connection: ProviderConnectionRecord | null;
}

/** Builds the session view of one provider. Pure; performs no I/O. */
export function deriveProviderSession(input: ProviderSessionInput): ProviderSession {
  const control = selectProviderControl({
    isSelectable: input.isSelectable,
    canDeepLink: input.supportsDeepLink,
    isNativeRuntime: input.isNativeRuntime,
  });

  const status: ProviderSessionStatus = !input.isSelectable
    ? "unavailable"
    : input.connection
      ? "connected"
      : "not_connected";

  return Object.freeze({
    providerKey: input.providerKey,
    providerId: input.providerId,
    displayName: input.displayName,
    status,
    lastAuthenticatedAt: input.connection?.connectedAt ?? null,
    lastUsedAt: input.connection?.lastUsedAt ?? null,
    controlMode: control.mode,
    control,
    canLaunch: control.capabilities.launch === "available",
    supportsManualSync: control.capabilities.manualSync === "available",
    hasFutureControl: control.capabilities.remoteControl === "planned",
  });
}

/** Records a fresh connection without ever touching provider credentials. */
export function connectProviderRecord(
  providerKey: string,
  at: Date,
  existing: ProviderConnectionRecord | null,
): ProviderConnectionRecord {
  return Object.freeze({
    providerKey,
    connectedAt: existing?.connectedAt ?? at.toISOString(),
    lastUsedAt: at.toISOString(),
  });
}

/** Translation key for a session status badge. */
export function providerSessionStatusKey(status: ProviderSessionStatus): string {
  return `provider.session.status.${status}`;
}
