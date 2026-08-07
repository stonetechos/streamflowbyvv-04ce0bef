/**
 * H8 — closed-beta experiment rules.
 *
 * Product assertions over the pure cohort, activation, research, and interview
 * logic. Nothing here runs a browser, and nothing here is certification
 * evidence: these are ordinary product tests over deterministic functions.
 */
import { describe, expect, test } from "bun:test";

import {
  ACTIVATION_EVENT,
  CLOSED_BETA,
  CORE_MVP_CAPABILITIES,
  EMPTY_FUNNEL,
  PREMIUM_CONCEPTS,
  activationRate,
  assignCohort,
  buildInterviewQueue,
  buildResearchResponse,
  buildSessionSummary,
  computeReliability,
  createActivationTracker,
  createBetaAnalytics,
  evaluateBetaAccess,
  isBillingActive,
  isCoreCapability,
  matchesCohort,
  medianOf,
  missingActivationRequirements,
  sanitizeContext,
  summarizeResearch,
  validateConcepts,
  type ActivationFacts,
  type AnalyticsContext,
  type BetaAccessConfig,
  type CohortFacts,
} from "@/domain";
import { enBundle } from "@/foundation/localization/bundles/en";
import { hiINBundle } from "@/foundation/localization/bundles/hi-IN";

const facts = (over: Partial<ActivationFacts> = {}): ActivationFacts => ({
  hasHost: true,
  guestCount: 1,
  hasValidMedia: true,
  countdownCompleted: true,
  phase: "watching",
  ...over,
});

const cohortFacts = (over: Partial<CohortFacts> = {}): CohortFacts => ({
  platform: "web-desktop",
  appVersion: "h8",
  providerId: "netflix",
  syncMode: "manual",
  inviteSource: "share_sheet",
  ...over,
});

const context = (over: Partial<AnalyticsContext> = {}): AnalyticsContext => ({
  sessionId: "s1",
  role: "host",
  providerId: "netflix",
  syncMode: "manual",
  platform: "web-desktop",
  deviceCategory: "desktop",
  appVersion: "h8",
  roomPhase: "watching",
  ...over,
});

describe("beta access", () => {
  test("the default configuration admits nobody", () => {
    expect(CLOSED_BETA.enabled).toBe(false);
    const decision = evaluateBetaAccess(CLOSED_BETA, { key: "anything" });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("beta_closed");
  });

  test("an allowlist admits only issued keys", () => {
    const config: BetaAccessConfig = {
      enabled: true,
      mode: "allowlist",
      allowlistKeys: ["key-a"],
      inviteCodes: [],
      internalKeys: [],
    };
    expect(evaluateBetaAccess(config, { key: "key-a" }).allowed).toBe(true);
    const denied = evaluateBetaAccess(config, { key: "key-b" });
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe("key_not_recognised");
  });

  test("a missing key is refused rather than assumed", () => {
    const config: BetaAccessConfig = {
      enabled: true,
      mode: "invite_only",
      allowlistKeys: [],
      inviteCodes: ["code"],
      internalKeys: [],
    };
    expect(evaluateBetaAccess(config, { key: null }).reason).toBe("key_missing");
  });

  test("an internal key is marked internal so it can be excluded from metrics", () => {
    const config: BetaAccessConfig = {
      enabled: true,
      mode: "allowlist",
      allowlistKeys: [],
      inviteCodes: [],
      internalKeys: ["team"],
    };
    const decision = evaluateBetaAccess(config, { key: "team" });
    expect(decision.allowed).toBe(true);
    expect(decision.internal).toBe(true);
  });

  test("a cohort carries no personal data", () => {
    const assignment = assignCohort({
      betaFlag: true,
      cohortId: "abc",
      inviteSource: "qr_code",
      platform: "web-mobile",
      appVersion: "h8",
    });
    const keys = Object.keys(assignment).join(" ");
    for (const banned of ["email", "name", "userId", "profileId", "ip", "key"]) {
      expect(keys.includes(banned)).toBe(false);
    }
  });

  test("an unset filter dimension matches everything and a wrong value matches nothing", () => {
    expect(matchesCohort(cohortFacts(), {})).toBe(true);
    expect(matchesCohort(cohortFacts(), { platform: "web-desktop" })).toBe(true);
    expect(matchesCohort(cohortFacts(), { platform: "web-mobile" })).toBe(false);
  });
});

describe("activation", () => {
  test("a solo host room is not activated", () => {
    expect(missingActivationRequirements(facts({ guestCount: 0 }))).toContain("guest_present");
  });

  test("an unfinished countdown is not activated", () => {
    expect(missingActivationRequirements(facts({ countdownCompleted: false }))).toContain(
      "countdown_completed",
    );
  });

  test("a room without a valid title is not activated", () => {
    expect(missingActivationRequirements(facts({ hasValidMedia: false }))).toContain(
      "valid_media_selected",
    );
  });

  test("a lobby room is not activated even with everyone present", () => {
    expect(missingActivationRequirements(facts({ phase: "lobby" }))).toContain("phase_watching");
  });

  test("a complete room satisfies every requirement", () => {
    expect(missingActivationRequirements(facts())).toEqual([]);
  });

  test("activation fires exactly once per room", () => {
    const tracker = createActivationTracker();
    expect(tracker.observe("room-1", facts())).toBe(true);
    expect(tracker.observe("room-1", facts())).toBe(false);
    expect(tracker.summary().activatedRooms).toBe(1);
  });

  test("the activation event has one canonical name", () => {
    expect(ACTIVATION_EVENT).toBe("room_reached_watching_with_host_and_guest");
  });

  test("medians are null until there is data", () => {
    expect(medianOf([])).toBeNull();
    expect(medianOf([10, 30])).toBe(20);
    expect(medianOf([5, 1, 3])).toBe(3);
  });

  test("the tracker reports engagement only among activated rooms", () => {
    const tracker = createActivationTracker();
    tracker.observe("a", facts());
    tracker.note("a", { usedVoice: true, participants: 3 });
    tracker.observe("b", facts({ guestCount: 0 }));
    const summary = tracker.summary();
    expect(summary.activatedRooms).toBe(1);
    expect(summary.voiceUsageAmongActivated).toBe(1);
    expect(summary.averageParticipantsPerActivatedRoom).toBe(3);
  });
});

describe("reliability and rates", () => {
  test("rates are null rather than zero when nothing has happened", () => {
    const reliability = computeReliability(EMPTY_FUNNEL);
    expect(reliability.inviteOpenSuccess).toBeNull();
    expect(reliability.voiceConnectionSuccess).toBeNull();
    expect(activationRate(EMPTY_FUNNEL)).toBeNull();
  });

  test("activation rate is measured against rooms created", () => {
    expect(activationRate({ ...EMPTY_FUNNEL, roomsCreated: 4, roomsActivated: 1 })).toBe(0.25);
  });

  test("the recorder counts the activation event into the funnel", () => {
    const recorder = createBetaAnalytics();
    recorder.record("room_created", context(), {}, "2026-01-01T00:00:00.000Z", "r1");
    recorder.record(ACTIVATION_EVENT, context(), {}, "2026-01-01T00:01:00.000Z", "r1");
    expect(recorder.snapshot().counts.roomsActivated).toBe(1);
    expect(activationRate(recorder.snapshot().counts)).toBe(1);
  });

  test("event context still carries no identifying fields", () => {
    const sanitized = sanitizeContext(context()) as Record<string, unknown>;
    for (const banned of ["email", "profileId", "displayName", "token", "cookie"]) {
      expect(sanitized[banned]).toBeUndefined();
    }
  });
});

describe("monetization research", () => {
  test("billing is not active", () => {
    expect(isBillingActive()).toBe(false);
  });

  test("no researched concept is a capability the MVP already promises", () => {
    expect(validateConcepts()).toEqual([]);
    for (const concept of PREMIUM_CONCEPTS) {
      expect(isCoreCapability(concept)).toBe(false);
    }
    expect(CORE_MVP_CAPABILITIES.length).toBeGreaterThan(0);
  });

  test("a skipped question is still a valid response", () => {
    const response = buildResearchResponse({ concept: "room_themes", value: null, pay: null });
    expect(response?.value).toBeNull();
    expect(response?.pay).toBeNull();
  });

  test("an unknown concept is rejected", () => {
    expect(buildResearchResponse({ concept: "free_text_wish" })).toBeNull();
  });

  test("summaries report response counts, not commitments", () => {
    const summary = summarizeResearch([
      buildResearchResponse({ concept: "video_chat", value: "very_valuable", pay: "yes" })!,
      buildResearchResponse({ concept: "video_chat", value: "not_valuable", pay: "no" })!,
    ]);
    const entry = summary.find((item) => item.concept === "video_chat");
    expect(entry?.responses).toBe(2);
    expect(entry?.payYesRate).toBe(0.5);
  });
});

describe("session summary and interviews", () => {
  test("a room that never reached watching says so plainly", () => {
    const summary = buildSessionSummary({
      timeline: {
        createdAt: "2026-01-01T00:00:00.000Z",
        firstGuestAt: null,
        mediaSelectedAt: null,
        watchingAt: null,
        endedAt: "2026-01-01T00:05:00.000Z",
      },
      participantCount: 1,
      providerId: null,
      reachedWatching: false,
      chatAvailable: true,
      voiceAvailable: false,
      reconnects: 0,
    });
    expect(summary.reachedWatching).toBe(false);
    expect(summary.durationMs).toBe(300_000);
  });

  test("the person who invited someone but never watched is asked first", () => {
    const queue = buildInterviewQueue([
      {
        cohortId: "happy",
        activated: true,
        invitedGuest: true,
        reachedWatching: true,
        returned: true,
        usedVoice: true,
        usedManualSync: false,
        reconnectFailures: 0,
      },
      {
        cohortId: "stuck",
        activated: false,
        invitedGuest: true,
        reachedWatching: false,
        returned: false,
        usedVoice: false,
        usedManualSync: false,
        reconnectFailures: 0,
      },
    ]);
    expect(queue[0]?.cohortId).toBe("stuck");
    expect(queue[0]?.signals).toContain("invited_but_never_watched");
  });

  test("a candidate with no signal is not queued", () => {
    const queue = buildInterviewQueue([
      {
        cohortId: "quiet",
        activated: false,
        invitedGuest: false,
        reachedWatching: false,
        returned: false,
        usedVoice: false,
        usedManualSync: false,
        reconnectFailures: 0,
      },
    ]);
    expect(queue).toEqual([]);
  });
});

describe("wording", () => {
  test("both bundles carry every H8 key", () => {
    const en = Object.keys(enBundle);
    const hi = Object.keys(hiINBundle);
    expect(hi.length).toBe(en.length);
    for (const key of en) expect(hiINBundle[key as keyof typeof hiINBundle]).toBeDefined();
  });

  test("participant-facing wording avoids experiment jargon", () => {
    const participantKeys = Object.keys(enBundle).filter(
      (key) => key.startsWith("room.recap.") || key.startsWith("research."),
    );
    expect(participantKeys.length).toBeGreaterThan(0);
    for (const key of participantKeys) {
      const value = String(enBundle[key as keyof typeof enBundle]).toLowerCase();
      for (const jargon of ["cohort", "activation", "funnel", "telemetry", "conversion"]) {
        expect(value.includes(jargon)).toBe(false);
      }
    }
  });

  test("the research surface states that nothing is for sale", () => {
    expect(String(enBundle["research.disclaimer"]).toLowerCase()).toContain("free");
  });
});
