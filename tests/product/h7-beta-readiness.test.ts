/**
 * H7 — closed-beta readiness rules.
 *
 * Product assertions over the pure onboarding-to-exit logic: the single next
 * step, feedback timing, funnel arithmetic, privacy of the event bag, and the
 * reliability guidance. Nothing here is certification evidence.
 */
import { describe, expect, test } from "bun:test";

import {
  EMPTY_FUNNEL,
  FAILURE_KINDS,
  FEEDBACK_CATEGORIES,
  buildFeedback,
  computeFunnel,
  createBetaAnalytics,
  dedupeKey,
  deriveActivationPlan,
  describeFailure,
  rate,
  sanitizeContext,
  shouldPromptFeedback,
  summarizeFeedback,
  type ActivationInput,
  type AnalyticsContext,
} from "@/domain";
import { enBundle } from "@/foundation/localization/bundles/en";
import { hiINBundle } from "@/foundation/localization/bundles/hi-IN";

const baseInput = (over: Partial<ActivationInput> = {}): ActivationInput => ({
  isHost: true,
  guestCount: 0,
  hasContent: false,
  isCountingDown: false,
  phase: "waiting-for-content",
  isEmbedded: false,
  hasOpenedProvider: false,
  isSelfReady: false,
  isVoiceConnected: false,
  isVoiceAvailable: true,
  ...over,
});

const context = (over: Partial<AnalyticsContext> = {}): AnalyticsContext => ({
  sessionId: "s1",
  role: "host",
  providerId: "netflix",
  syncMode: "launch-only",
  platform: "web",
  deviceCategory: "desktop",
  appVersion: "1.0.0-rc.1",
  roomPhase: "waiting-for-content",
  ...over,
});

describe("activation", () => {
  test("a host alone in a fresh room is asked to invite, not to pick content", () => {
    expect(deriveActivationPlan(baseInput()).primary).toBe("invite_someone");
  });

  test("with someone present and nothing chosen, the host picks content", () => {
    expect(deriveActivationPlan(baseInput({ guestCount: 1 })).primary).toBe("choose_content");
  });

  test("content plus company is a countdown, not another invite", () => {
    const plan = deriveActivationPlan(baseInput({ guestCount: 2, hasContent: true }));
    expect(plan.primary).toBe("start_countdown");
  });

  test("a guest waiting on the host is told to wait rather than given a button", () => {
    const plan = deriveActivationPlan(baseInput({ isHost: false, hasContent: false }));
    expect(plan.primary).toBe("wait_for_host");
  });

  test("a guest with launch-only content is sent to the provider first", () => {
    const plan = deriveActivationPlan(
      baseInput({ isHost: false, hasContent: true, phase: "content-selected" }),
    );
    expect(plan.primary).toBe("open_provider");
  });

  test("once the provider is open the guest marks themselves ready", () => {
    const plan = deriveActivationPlan(
      baseInput({ isHost: false, hasContent: true, hasOpenedProvider: true }),
    );
    expect(plan.primary).toBe("mark_ready");
  });

  test("exactly one step is current at any moment", () => {
    for (const isHost of [true, false]) {
      const plan = deriveActivationPlan(baseInput({ isHost, guestCount: 1, hasContent: true }));
      expect(plan.steps.filter((step) => step.state === "current")).toHaveLength(1);
    }
  });
});

describe("feedback", () => {
  test("a live party is never interrupted", () => {
    expect(
      shouldPromptFeedback({
        phase: "watching",
        hasLeft: false,
        alreadyAnswered: false,
        dismissed: false,
      }),
    ).toBe(false);
  });

  test("leaving the room opens the two questions", () => {
    expect(
      shouldPromptFeedback({
        phase: "watching",
        hasLeft: true,
        alreadyAnswered: false,
        dismissed: false,
      }),
    ).toBe(true);
  });

  test("dismissal is a final answer", () => {
    expect(
      shouldPromptFeedback({ phase: "ended", hasLeft: true, alreadyAnswered: false, dismissed: true }),
    ).toBe(false);
  });

  test("unknown categories are dropped and duplicates collapse", () => {
    const entry = buildFeedback({
      outcome: "no",
      categories: ["voice_problem", "voice_problem", "not_a_category"],
    });
    expect(entry.categories).toEqual(["voice_problem"]);
  });

  test("an empty comment is stored as absence, not as an empty string", () => {
    expect(buildFeedback({ outcome: "yes", categories: [], comment: "   " }).comment).toBeNull();
  });

  test("a summary counts outcomes and categories it was given", () => {
    const summary = summarizeFeedback([
      buildFeedback({ outcome: "partly", categories: ["chat_problem"] }),
      buildFeedback({ outcome: "no", categories: ["chat_problem", "voice_problem"] }),
    ]);
    expect(summary.total).toBe(2);
    expect(summary.byOutcome.no).toBe(1);
    expect(summary.byCategory["chat_problem"]).toBe(2);
  });
});

describe("analytics", () => {
  test("a rate with no denominator is unknown, never zero", () => {
    expect(rate(0, 0)).toBeNull();
    expect(computeFunnel(EMPTY_FUNNEL).landingToRoomCreation).toBeNull();
  });

  test("the ten funnel rates are all reported", () => {
    expect(Object.keys(computeFunnel(EMPTY_FUNNEL))).toHaveLength(10);
  });

  test("once-per-session events deduplicate, per-room events do not collide", () => {
    expect(dedupeKey("landing_viewed", null)).toBe(dedupeKey("landing_viewed", "room-b"));
    expect(dedupeKey("room_created", "room-a")).not.toBe(dedupeKey("room_created", "room-b"));
  });

  test("a recorder refuses a duplicate and keeps the first", () => {
    const recorder = createBetaAnalytics();
    expect(recorder.record("landing_viewed", context())).not.toBeNull();
    expect(recorder.record("landing_viewed", context())).toBeNull();
    expect(recorder.snapshot().counts.landingViewed).toBe(1);
  });

  test("private values never survive into an event", () => {
    const recorder = createBetaAnalytics();
    const event = recorder.record("chat_message_sent", context(), {
      message: "see you at the end",
      token: "secret",
      cookie: "sid=1",
      length: 12,
    });
    expect(event?.props).toEqual({ length: 12 });
  });

  test("the context keeps only coarse, non-identifying facts", () => {
    const cleaned = sanitizeContext(context({ platform: "a".repeat(200) }));
    expect(cleaned.platform.length).toBeLessThanOrEqual(64);
    expect(Object.keys(cleaned).sort()).toEqual(
      [
        "appVersion",
        "deviceCategory",
        "platform",
        "providerId",
        "role",
        "roomPhase",
        "sessionId",
        "syncMode",
      ].sort(),
    );
  });

  test("a room reaching watching is counted once for the funnel", () => {
    const recorder = createBetaAnalytics();
    recorder.record("countdown_started", context(), {}, undefined, "room-a");
    recorder.record("watching_started", context(), {}, undefined, "room-a");
    recorder.record("watching_started", context(), {}, undefined, "room-a");
    const counts = recorder.snapshot().counts;
    expect(counts.watchingStarted).toBe(1);
    expect(computeFunnel(counts).countdownToWatching).toBe(1);
  });
});

describe("reliability guidance", () => {
  test("every failure kind answers what happened and what to do", () => {
    for (const kind of FAILURE_KINDS) {
      const guidance = describeFailure(kind);
      expect(enBundle.strings[guidance.whatKey]).toBeTruthy();
      expect(enBundle.strings[guidance.nextKey]).toBeTruthy();
    }
  });

  test("an expired invite is the one case where the party is not still on", () => {
    expect(describeFailure("invite_expired").roomStillActive).toBe(false);
    expect(describeFailure("connection_lost").roomStillActive).toBe(true);
  });
});

describe("copy", () => {
  test("every feedback category and activation step has English copy", () => {
    for (const category of FEEDBACK_CATEGORIES) {
      expect(enBundle.strings[`room.feedback.category.${category}`]).toBeTruthy();
    }
    const plan = deriveActivationPlan(baseInput({ guestCount: 1, hasContent: true }));
    for (const step of plan.steps) {
      expect(enBundle.strings[`room.activation.step.${step.key}`]).toBeTruthy();
    }
  });

  test("the Hindi bundle carries the H7 keys the English bundle added", () => {
    const missing = Object.keys(enBundle.strings)
      .filter((key) => key.startsWith("room.failure.") || key.startsWith("room.activation."))
      .filter((key) => !hiINBundle.strings[key]);
    expect(missing).toEqual([]);
  });

  test("no beta copy mentions a service the product does not support", () => {
    const youtube = Object.entries(enBundle.strings).filter(([, value]) =>
      /youtube/i.test(value),
    );
    expect(youtube).toEqual([]);
  });
});
