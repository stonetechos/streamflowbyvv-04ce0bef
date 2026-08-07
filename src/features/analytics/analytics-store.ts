/**
 * Beta analytics store — Sprint H7.
 *
 * One recorder for the whole tab, so the funnel spans the landing page, the
 * onboarding sequence and the room rather than resetting on every mount. It is
 * session-only: nothing is written to storage, nothing is sent to a server, and
 * the session id is a random value that outlives no tab.
 *
 * Redaction rules (development logging included): no credentials, no cookies,
 * no full invite tokens, no chat contents, no voice data. `sanitizeProps` in
 * the domain layer enforces the key filter; this module never widens it.
 */
import {
  assignCohort,
  buildFeedback,
  buildResearchResponse,
  buildSessionSummary,
  computeReliability,
  createActivationTracker,
  createBetaAnalytics,
  matchesCohort,
  summarizeFeedback,
  summarizeJoinSpeed,
  summarizePersonalization,
  summarizeResearch,
  withActivationStatus,
  withFeedbackStatus,
  type AnalyticsContext,
  type AnalyticsEventName,
  type BetaAnalyticsSnapshot,
  type DeviceCategory,
  type FeedbackCategory,
  type FeedbackEntry,
  type FeedbackOutcome,
  type ActivationFacts,
  type ActivationSummary,
  type CohortAssignment,
  type CohortFacts,
  type CohortFilter,
  type InviteSource,
  type JoinAttemptFact,
  type JoinSpeedMetrics,
  type PersonalizationFact,
  type PersonalizationMetrics,
  type SelectionFact,
  type ReliabilityMetrics,
  type ResearchResponse,
  type RoomRoleLabel,
  type RoomTimeline,
  type SessionSummary,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "beta-analytics";

/** Product build label. Deliberately coarse: never a commit or a device id. */
export const APP_VERSION = "1.0.0-rc.1";

const recorder = createBetaAnalytics();
const activation = createActivationTracker();
let feedback: FeedbackEntry[] = [];
let research: ResearchResponse[] = [];
let events: { readonly facts: CohortFacts; readonly name: string }[] = [];
let joinAttempts: JoinAttemptFact[] = [];
let personalization: PersonalizationFact[] = [];
let selections: SelectionFact[] = [];
let customized = false;
const listeners = new Set<() => void>();

function randomId(): string {
  const globalCrypto = typeof crypto !== "undefined" ? crypto : undefined;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID().slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

const sessionId = randomId();

/**
 * One cohort record per tab. It is created eagerly so every event carries a
 * cohort dimension, and it starts outside the beta: admission is granted by
 * `grantBetaAccess`, never assumed.
 */
let cohort: CohortAssignment = assignCohort({
  betaFlag: false,
  cohortId: randomId(),
  platform: "unknown",
  appVersion: APP_VERSION,
});

function deviceCategory(): DeviceCategory {
  if (typeof window === "undefined") return "unknown";
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function platform(): string {
  if (typeof navigator === "undefined") return "server";
  // Coarse family only — never the full user-agent string.
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/mac os/i.test(ua)) return "macos";
  if (/windows/i.test(ua)) return "windows";
  return "web";
}

export function readCohort(): CohortAssignment {
  return cohort;
}

/** Called once admission has been decided elsewhere; never decides it here. */
export function grantBetaAccess(input: {
  readonly inviteSource: InviteSource;
  readonly internal: boolean;
}): CohortAssignment {
  cohort = assignCohort({
    betaFlag: true,
    cohortId: cohort.cohortId,
    inviteSource: input.inviteSource,
    platform: platform(),
    appVersion: APP_VERSION,
    firstSessionAt: cohort.firstSessionAt,
    internal: input.internal,
  });
  notify();
  return cohort;
}

/** A fresh anonymous cohort id. Used by internal testers and by opt-out. */
export function resetBetaCohort(): CohortAssignment {
  cohort = assignCohort({
    betaFlag: cohort.betaFlag,
    cohortId: randomId(),
    inviteSource: cohort.inviteSource,
    platform: platform(),
    appVersion: APP_VERSION,
    internal: cohort.internal,
  });
  activation.reset();
  notify();
  return cohort;
}

export interface TrackOptions {
  readonly role?: RoomRoleLabel;
  readonly providerId?: string | null;
  readonly syncMode?: string | null;
  readonly roomPhase?: string | null;
  /** Opaque room correlation used only for per-room deduplication. */
  readonly roomKey?: string | null;
}

function notify(): void {
  cached = null;
  for (const listener of listeners) listener();
}

export function trackEvent(
  name: AnalyticsEventName,
  props: Readonly<Record<string, unknown>> = {},
  options: TrackOptions = {},
): void {
  const context: AnalyticsContext = {
    sessionId,
    role: options.role ?? "visitor",
    providerId: options.providerId ?? null,
    syncMode: options.syncMode ?? null,
    platform: platform(),
    deviceCategory: deviceCategory(),
    appVersion: APP_VERSION,
    roomPhase: options.roomPhase ?? null,
  };
  const event = recorder.record(
    name,
    context,
    props,
    new Date().toISOString(),
    options.roomKey ?? null,
  );
  if (event === null) return;
  // Cohort dimensions are kept beside the event name only, so the dashboard
  // can slice counts without ever needing the event's own payload.
  events = [
    ...events,
    {
      name,
      facts: {
        platform: context.platform,
        appVersion: context.appVersion,
        providerId: context.providerId,
        syncMode: context.syncMode,
        inviteSource: cohort.inviteSource,
      },
    },
  ].slice(-500);
  logger.debug("product_event", {
    module: MODULE,
    event: name,
    role: event.context.role,
    phase: event.context.roomPhase ?? "none",
    ...event.props,
  });
  notify();
}

export function recordFeedback(input: {
  readonly outcome: FeedbackOutcome;
  readonly categories: readonly FeedbackCategory[];
  readonly comment?: string | null;
}): FeedbackEntry {
  const entry = buildFeedback(input);
  feedback = [entry, ...feedback].slice(0, 50);
  cohort = withFeedbackStatus(cohort, "answered");
  notify();
  return entry;
}

export function dismissFeedback(): void {
  cohort = withFeedbackStatus(cohort, "dismissed");
  notify();
}

/* ------------------------------------------------------------- activation */

/**
 * Reports the room's current facts. Returns true exactly once, on the
 * transition into activation, which is when the primary beta event fires.
 * A solo host room, a started-but-unfinished countdown, or a room without a
 * media selection never reaches this point — the domain tracker decides.
 */
export function observeActivation(
  roomKey: string,
  facts: ActivationFacts,
  options: TrackOptions = {},
): boolean {
  const becameActive = activation.observe(roomKey, facts);
  cohort = withActivationStatus(cohort, becameActive ? "activated" : "in_progress");
  if (becameActive) {
    trackEvent(
      "room_reached_watching_with_host_and_guest",
      { participants: facts.guestCount + 1 },
      { ...options, roomKey },
    );
  } else {
    notify();
  }
  return becameActive;
}

export function markRoomMoment(roomKey: string, moment: keyof RoomTimeline): void {
  activation.mark(roomKey, moment);
  notify();
}

export function noteRoomFact(
  roomKey: string,
  fact: Parameters<ReturnType<typeof createActivationTracker>["note"]>[1],
): void {
  activation.note(roomKey, fact);
  notify();
}

export function readSessionSummary(
  roomKey: string,
  input: {
    readonly providerId: string | null;
    readonly chatAvailable: boolean;
    readonly voiceAvailable: boolean;
    readonly reconnects: number;
  },
): SessionSummary {
  const room = activation.rooms().find((entry) => entry.roomKey === roomKey);
  return buildSessionSummary({
    timeline: room?.timeline ?? {
      createdAt: null,
      firstGuestAt: null,
      mediaSelectedAt: null,
      watchingAt: null,
      endedAt: null,
    },
    participantCount: room?.participants ?? 0,
    providerId: input.providerId,
    reachedWatching: room?.activated ?? false,
    chatAvailable: input.chatAvailable,
    voiceAvailable: input.voiceAvailable,
    reconnects: input.reconnects,
  });
}

/* ------------------------------------------------ monetization research */

/** Records a research answer. There is no billing path behind this call. */
export function recordResearch(input: {
  readonly concept: string;
  readonly value?: string | null;
  readonly pay?: string | null;
}): ResearchResponse | null {
  const response = buildResearchResponse(input);
  if (response === null) return null;
  research = [response, ...research].slice(0, 200);
  notify();
  return response;
}

/* ------------------------------------------------------------ H9 facts */

/**
 * The moment this tab became usable. Join speed is measured from here, so the
 * dashboard can say "app open to joined" without ever timing a person.
 */
const openedAt = Date.now();

/** Milliseconds since the app opened; never a wall-clock time in an event. */
export function sinceAppOpen(): number {
  return Date.now() - openedAt;
}

export function recordJoinAttempt(fact: JoinAttemptFact): void {
  joinAttempts = [...joinAttempts, fact].slice(-200);
  notify();
}

export function recordPersonalization(fact: PersonalizationFact): void {
  personalization = [...personalization, fact].slice(-200);
  notify();
}

export function recordAppSelection(fact: SelectionFact): void {
  selections = [...selections, fact].slice(-200);
  notify();
}

/** Set by the home shelf so the dashboard knows this tab arranged anything. */
export function noteCustomized(value: boolean): void {
  if (customized === value) return;
  customized = value;
  notify();
}

export interface BetaStoreSnapshot extends BetaAnalyticsSnapshot {
  readonly feedback: readonly FeedbackEntry[];
  readonly feedbackSummary: ReturnType<typeof summarizeFeedback>;
  readonly research: readonly ResearchResponse[];
  readonly researchSummary: ReturnType<typeof summarizeResearch>;
  readonly reliability: ReliabilityMetrics;
  readonly activation: ActivationSummary;
  readonly rooms: ReturnType<typeof activation.rooms>;
  readonly cohort: CohortAssignment;
  readonly sessionId: string;
  readonly appVersion: string;
  readonly joinSpeed: JoinSpeedMetrics;
  readonly personalization: PersonalizationMetrics;
}

/** Counts events matching a cohort filter, for dashboard slicing. */
export function countByCohort(name: string, filter: CohortFilter): number {
  return events.filter((entry) => entry.name === name && matchesCohort(entry.facts, filter)).length;
}

/** The distinct values seen for a dimension, so the filter offers real options. */
export function cohortValues(dimension: keyof CohortFacts): readonly string[] {
  const seen = new Set<string>();
  for (const entry of events) seen.add(String(entry.facts[dimension] ?? "unknown"));
  return [...seen].sort();
}

let cached: BetaStoreSnapshot | null = null;

export function readSnapshot(): BetaStoreSnapshot {
  if (cached) return cached;
  const base = recorder.snapshot();
  cached = {
    ...base,
    feedback,
    feedbackSummary: summarizeFeedback(feedback),
    research,
    researchSummary: summarizeResearch(research),
    reliability: computeReliability(base.counts),
    activation: activation.summary(),
    rooms: activation.rooms(),
    cohort,
    sessionId,
    appVersion: APP_VERSION,
    joinSpeed: summarizeJoinSpeed(joinAttempts),
    personalization: summarizePersonalization(personalization, selections, { customized }),
  };
  return cached;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetAnalytics(): void {
  recorder.reset();
  activation.reset();
  feedback = [];
  research = [];
  events = [];
  joinAttempts = [];
  personalization = [];
  selections = [];
  customized = false;
  cached = null;
  notify();
}
