/**
 * Beta admission — Sprint H8.
 *
 * The closed beta is configured through build-time environment values and
 * defaults to closed. If nothing is configured, nobody is admitted: an
 * accidentally open beta is a worse failure than an empty one.
 *
 * Keys are opaque tokens issued by the team out of band. They are compared and
 * discarded; nothing here stores a key, logs a key, or ties one to a person.
 */
import {
  CLOSED_BETA,
  evaluateBetaAccess,
  isInviteSource,
  type BetaAccessConfig,
  type BetaAccessDecision,
  type BetaAccessMode,
  type InviteSource,
} from "@/domain";

import { grantBetaAccess, trackEvent } from "./analytics-store";

function list(value: string | undefined): readonly string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function mode(value: string | undefined): BetaAccessMode {
  return value === "allowlist" || value === "invite_only" ? value : "disabled";
}

export function readBetaConfig(): BetaAccessConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  const allowlistKeys = list(env["VITE_BETA_ALLOWLIST_KEYS"]);
  const inviteCodes = list(env["VITE_BETA_INVITE_CODES"]);
  const internalKeys = list(env["VITE_BETA_INTERNAL_KEYS"]);
  const configuredMode = mode(env["VITE_BETA_MODE"]);
  const enabled = env["VITE_BETA_ENABLED"] === "true" && configuredMode !== "disabled";
  if (!enabled) return CLOSED_BETA;
  return { enabled, mode: configuredMode, allowlistKeys, inviteCodes, internalKeys };
}

/** Reads the invite source from the URL without keeping the key itself. */
export function readInviteSource(search: string): InviteSource {
  const params = new URLSearchParams(search);
  const value = params.get("from") ?? "";
  return isInviteSource(value) ? value : "direct_link";
}

/**
 * Decides admission and, when granted, stamps the cohort. The raw key is never
 * passed on: only the decision and the coarse source travel further.
 */
export function requestBetaAccess(input: {
  readonly key: string | null;
  readonly source?: InviteSource;
  readonly config?: BetaAccessConfig;
}): BetaAccessDecision {
  const decision = evaluateBetaAccess(input.config ?? readBetaConfig(), {
    key: input.key,
    source: input.source ?? "unknown",
  });
  if (decision.allowed) {
    grantBetaAccess({ inviteSource: decision.source, internal: decision.internal });
    trackEvent("beta_access_granted", { source: decision.source, internal: decision.internal });
  } else {
    trackEvent("beta_access_denied", { reason: decision.reason });
  }
  return decision;
}
