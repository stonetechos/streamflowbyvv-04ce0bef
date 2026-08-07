/**
 * Closed-beta cohort model — Sprint H8.
 *
 * A cohort record answers "which controlled group is this browser session in",
 * and nothing else. It holds an anonymous cohort id, how the person arrived,
 * a coarse platform, the app version, a first-session timestamp, and two
 * status flags. It never holds a name, an email, an account id, an IP, a
 * device fingerprint, or a location.
 *
 * Access is closed by construction: the default mode admits nobody. A beta key
 * is an opaque token the team issues out of band; this module compares it and
 * never stores or logs the raw value alongside anything identifying.
 */

export const BETA_ACCESS_MODES = ["disabled", "allowlist", "invite_only"] as const;
export type BetaAccessMode = (typeof BETA_ACCESS_MODES)[number];

export const INVITE_SOURCES = [
  "direct_link",
  "share_sheet",
  "qr_code",
  "allowlist",
  "internal",
  "unknown",
] as const;
export type InviteSource = (typeof INVITE_SOURCES)[number];

export const ACTIVATION_STATUSES = ["not_started", "in_progress", "activated"] as const;
export type ActivationStatus = (typeof ACTIVATION_STATUSES)[number];

export const FEEDBACK_STATUSES = ["none", "dismissed", "answered"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export function isInviteSource(value: string): value is InviteSource {
  return (INVITE_SOURCES as readonly string[]).includes(value);
}

/* ------------------------------------------------------------ access config */

export interface BetaAccessConfig {
  /** Master switch. Turning this off closes the beta without any other edit. */
  readonly enabled: boolean;
  readonly mode: BetaAccessMode;
  /** Opaque keys issued to allowlisted participants. Never emails. */
  readonly allowlistKeys: readonly string[];
  /** Opaque invite codes accepted in invite-only mode. */
  readonly inviteCodes: readonly string[];
  /** Internal testers, kept separate so they never pollute cohort metrics. */
  readonly internalKeys: readonly string[];
}

/**
 * Closed by default. A beta that opens itself because a config was forgotten
 * is a worse failure than a beta nobody can enter.
 */
export const CLOSED_BETA: BetaAccessConfig = Object.freeze({
  enabled: false,
  mode: "disabled",
  allowlistKeys: Object.freeze([]) as readonly string[],
  inviteCodes: Object.freeze([]) as readonly string[],
  internalKeys: Object.freeze([]) as readonly string[],
});

export const BETA_DENIAL_REASONS = [
  "beta_disabled",
  "not_allowlisted",
  "invalid_invite",
  "missing_key",
] as const;
export type BetaDenialReason = (typeof BETA_DENIAL_REASONS)[number];

export interface BetaAccessDecision {
  readonly allowed: boolean;
  readonly reason: BetaDenialReason | null;
  readonly internal: boolean;
  readonly source: InviteSource;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/**
 * Decides admission. The key is compared, never retained: callers receive a
 * decision, not the key back.
 */
export function evaluateBetaAccess(
  config: BetaAccessConfig,
  request: { readonly key?: string | null; readonly source?: InviteSource },
): BetaAccessDecision {
  const source = request.source ?? "unknown";
  if (!config.enabled || config.mode === "disabled") {
    return { allowed: false, reason: "beta_disabled", internal: false, source };
  }

  const key = normalize(request.key);
  if (key.length === 0) {
    return { allowed: false, reason: "missing_key", internal: false, source };
  }

  if (config.internalKeys.includes(key)) {
    return { allowed: true, reason: null, internal: true, source: "internal" };
  }

  if (config.mode === "allowlist") {
    return config.allowlistKeys.includes(key)
      ? { allowed: true, reason: null, internal: false, source: "allowlist" }
      : { allowed: false, reason: "not_allowlisted", internal: false, source };
  }

  return config.inviteCodes.includes(key)
    ? { allowed: true, reason: null, internal: false, source }
    : { allowed: false, reason: "invalid_invite", internal: false, source };
}

/* ---------------------------------------------------------- cohort assignment */

export interface CohortAssignment {
  readonly betaFlag: boolean;
  readonly cohortId: string;
  readonly inviteSource: InviteSource;
  readonly platform: string;
  readonly appVersion: string;
  readonly firstSessionAt: string;
  readonly activationStatus: ActivationStatus;
  readonly feedbackStatus: FeedbackStatus;
  readonly internal: boolean;
}

/** Keys that must never reach a cohort record, whatever a caller passes. */
const FORBIDDEN_COHORT_KEYS = new Set([
  "email",
  "name",
  "displayName",
  "handle",
  "userId",
  "accountId",
  "ip",
  "latitude",
  "longitude",
  "location",
  "token",
  "inviteToken",
  "cookie",
  "password",
]);

export function assignCohort(input: {
  readonly betaFlag: boolean;
  readonly cohortId: string;
  readonly inviteSource?: InviteSource;
  readonly platform: string;
  readonly appVersion: string;
  readonly firstSessionAt?: string;
  readonly internal?: boolean;
}): CohortAssignment {
  return {
    betaFlag: input.betaFlag,
    cohortId: input.cohortId,
    inviteSource: input.inviteSource ?? "unknown",
    platform: input.platform,
    appVersion: input.appVersion,
    firstSessionAt: input.firstSessionAt ?? new Date().toISOString(),
    activationStatus: "not_started",
    feedbackStatus: "none",
    internal: input.internal ?? false,
  };
}

/**
 * A cohort record is a dimension bag for the dashboard, so it goes through the
 * same discipline as an event: only the declared fields survive.
 */
export function sanitizeCohort(input: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_COHORT_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

export function withActivationStatus(
  cohort: CohortAssignment,
  status: ActivationStatus,
): CohortAssignment {
  // Activation is a ratchet: a room that already counted cannot un-count.
  if (cohort.activationStatus === "activated") return cohort;
  return { ...cohort, activationStatus: status };
}

export function withFeedbackStatus(
  cohort: CohortAssignment,
  status: FeedbackStatus,
): CohortAssignment {
  return { ...cohort, feedbackStatus: status };
}

/** A fresh cohort with a new anonymous id — used for testing and for opt-out. */
export function resetCohort(cohort: CohortAssignment, nextCohortId: string): CohortAssignment {
  return assignCohort({
    betaFlag: cohort.betaFlag,
    cohortId: nextCohortId,
    inviteSource: cohort.inviteSource,
    platform: cohort.platform,
    appVersion: cohort.appVersion,
    internal: cohort.internal,
  });
}

/* ------------------------------------------------------------- cohort filter */

export const COHORT_DIMENSIONS = [
  "platform",
  "appVersion",
  "providerId",
  "syncMode",
  "inviteSource",
] as const;
export type CohortDimension = (typeof COHORT_DIMENSIONS)[number];

export type CohortFilter = Partial<Record<CohortDimension, string>>;

export interface CohortFacts {
  readonly platform: string;
  readonly appVersion: string;
  readonly providerId: string | null;
  readonly syncMode: string | null;
  readonly inviteSource: InviteSource;
}

/** An unset dimension matches everything; an unknown value matches nothing. */
export function matchesCohort(facts: CohortFacts, filter: CohortFilter): boolean {
  for (const dimension of COHORT_DIMENSIONS) {
    const wanted = filter[dimension];
    if (wanted === undefined || wanted === "") continue;
    const actual = facts[dimension];
    if ((actual ?? "unknown") !== wanted) return false;
  }
  return true;
}
