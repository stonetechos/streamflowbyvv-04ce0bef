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
  buildFeedback,
  createBetaAnalytics,
  summarizeFeedback,
  type AnalyticsContext,
  type AnalyticsEventName,
  type BetaAnalyticsSnapshot,
  type DeviceCategory,
  type FeedbackCategory,
  type FeedbackEntry,
  type FeedbackOutcome,
  type RoomRoleLabel,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "beta-analytics";

/** Product build label. Deliberately coarse: never a commit or a device id. */
export const APP_VERSION = "1.0.0-rc.1";

const recorder = createBetaAnalytics();
let feedback: FeedbackEntry[] = [];
const listeners = new Set<() => void>();

function randomId(): string {
  const globalCrypto = typeof crypto !== "undefined" ? crypto : undefined;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID().slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

const sessionId = randomId();

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
  notify();
  return entry;
}

export interface BetaStoreSnapshot extends BetaAnalyticsSnapshot {
  readonly feedback: readonly FeedbackEntry[];
  readonly feedbackSummary: ReturnType<typeof summarizeFeedback>;
  readonly sessionId: string;
  readonly appVersion: string;
}

let cached: BetaStoreSnapshot | null = null;

export function readSnapshot(): BetaStoreSnapshot {
  if (cached) return cached;
  const base = recorder.snapshot();
  cached = {
    ...base,
    feedback,
    feedbackSummary: summarizeFeedback(feedback),
    sessionId,
    appVersion: APP_VERSION,
  };
  return cached;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetAnalytics(): void {
  recorder.reset();
  feedback = [];
  cached = null;
  notify();
}
