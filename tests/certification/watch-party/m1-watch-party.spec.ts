/**
 * M1 watch-party certification — WP6 (Countdown synchronization and stage
 * progression), Watch Party engine, rows CERT-WP-01 and CERT-WP-02.
 *
 * WP1 could only park these two rows as `unmeasured`: countdown zero was not
 * observable from outside the app, and `room_state` carries no stage column.
 * WP6 closes both. Production now surfaces the instant each client observed
 * the shared countdown target pass (`data-sf-countdown-zero-at`, written by
 * `useRoomCountdown`), and the lobby already publishes its journey stage
 * (`data-sf-stage`). Both are read here from real browsers.
 *
 * The countdown itself is written the way the host's client writes it — the
 * durable runtime keys owned by `src/domain/countdown/countdown-runtime.ts`,
 * through the Data API under the host's own RLS privileges. No product code is
 * bypassed on the reading side: every client derives zero from the same
 * server-written `countdown_target_at`.
 *
 * User journey: host starts; everyone counts down together and reaches the
 * stage together. Watch-party objective: the moment of starting together
 * actually lands together, and every participant sees the same "what happens
 * next" state.
 */
import { test } from "@playwright/test";

import { backendConfigured } from "../fixtures/backend";
import {
  createRoomWithCapacity,
  disposeRoom,
  joinAsGuest,
  provisionParticipants,
  seatHost,
  signedInContext,
  type CertParticipant,
  type CertRoom,
  type SignedInSession,
} from "../fixtures/identities";
import { measureConvergence } from "../helpers/instrumentation";
import { recordM1Row } from "../helpers/m1-rows";

const BASE_URL = process.env["CERT_BASE_URL"] ?? "http://localhost:8080";

/** C4 performance budget: countdown spread ≤ 250 ms p95. */
const COUNTDOWN_SPREAD_BUDGET_MS = 250;

/** Long enough for every client to have loaded the runtime before zero. */
const COUNTDOWN_LEAD_MS = 12_000;

/**
 * Arms a countdown exactly as the host's client would: the durable runtime
 * keys in the room metadata bag, merged over whatever the room already holds.
 */
async function armCountdown(
  host: CertParticipant,
  room: CertRoom,
  leadMs: number,
): Promise<string | null> {
  const { data: current } = await host.identity.client
    .from("rooms")
    .select("metadata")
    .eq("id", room.id)
    .maybeSingle();
  const now = Date.now();
  const targetAt = new Date(now + leadMs).toISOString();
  const metadata = {
    ...((current?.["metadata"] as Record<string, unknown> | null) ?? {}),
    countdown_state: "counting_down",
    countdown_target_at: targetAt,
    countdown_started_at: new Date(now).toISOString(),
    countdown_host_profile_id: host.profileId,
    countdown_reason: null,
    countdown_revision: 1,
    countdown_seconds: Math.round(leadMs / 1000),
  };
  const { data } = await host.identity.client
    .from("rooms")
    .update({ metadata })
    .eq("id", room.id)
    .select("id")
    .maybeSingle();
  return data ? targetAt : null;
}

test.describe("M1 watch party", () => {
  test.slow();
  test.describe.configure({ mode: "serial" });

  let participants: readonly CertParticipant[] | null = null;
  let room: CertRoom | null = null;

  test.beforeAll(async () => {
    if (!backendConfigured) return;
    participants = await provisionParticipants(3, "wp");
    if (!participants) return;
    room = await createRoomWithCapacity(participants[0]!, 4, "M1 watch party");
    if (!room) return;
    await seatHost(participants[0]!, room);
    await joinAsGuest(participants[1]!, room);
    await joinAsGuest(participants[2]!, room);
  });

  test.afterAll(async () => {
    if (participants && room) await disposeRoom(participants[0]!, room);
  });

  test("CERT-WP-01 all participants reach countdown zero within spread", async ({
    browser,
    browserName,
  }) => {
    if (!participants || !room) {
      recordM1Row("CERT-WP-01", {
        status: "unmeasured",
        detail: "Certification identities or a lobby could not be provisioned in this environment.",
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }

    const targetAt = await armCountdown(participants[0]!, room, COUNTDOWN_LEAD_MS);
    if (targetAt === null) {
      recordM1Row("CERT-WP-01", {
        status: "unmeasured",
        detail: "The host could not write the countdown runtime for this room.",
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }

    const sessions: SignedInSession[] = [];
    try {
      for (const participant of participants) {
        const session = await signedInContext(browser, participant, BASE_URL);
        if (!session) continue;
        await session.page.goto(`${BASE_URL}/rooms/${room.id}`, {
          waitUntil: "domcontentloaded",
        });
        sessions.push(session);
      }

      if (sessions.length < 2) {
        recordM1Row("CERT-WP-01", {
          status: "unmeasured",
          detail: "Fewer than two concurrent signed-in browsers reached the lobby.",
          profileId: "PROF-07",
          browser: browserName,
          platform: "web-desktop",
        });
        return;
      }

      const result = await measureConvergence(
        sessions.map((session, index) => ({
          label: `client-${index}`,
          read: () =>
            session.page.evaluate(
              () =>
                document
                  .querySelector("[data-sf-countdown-zero-at]")
                  ?.getAttribute("data-sf-countdown-zero-at") ?? null,
            ),
        })),
        (value) => value !== null,
        { timeoutMs: COUNTDOWN_LEAD_MS + 30_000, pollMs: 25 },
      );

      if (!result.converged) {
        recordM1Row("CERT-WP-01", {
          status: "fail",
          detail: `Not every client reached countdown zero. Observations: ${JSON.stringify(
            result.samples.map((sample) => ({ label: sample.label, zeroAt: sample.value })),
          )}.`,
          profileId: "PROF-07",
          browser: browserName,
          platform: "web-desktop",
        });
        return;
      }

      // The reported instants are the clients' own observations of the shared
      // target, not the harness's polling times: the spread is measured from
      // the timestamps the product itself wrote.
      const instants = result.samples
        .map((sample) => Date.parse(String(sample.value)))
        .filter((value) => Number.isFinite(value));
      const spreadMs = Math.max(...instants) - Math.min(...instants);
      const withinBudget = spreadMs <= COUNTDOWN_SPREAD_BUDGET_MS;

      recordM1Row("CERT-WP-01", {
        status: withinBudget ? "pass" : "fail",
        detail: withinBudget
          ? `All ${sessions.length} participants reached countdown zero; observed spread ${spreadMs} ms against the C4 budget of ${COUNTDOWN_SPREAD_BUDGET_MS} ms.`
          : `All ${sessions.length} participants reached countdown zero, but the observed spread of ${spreadMs} ms exceeds the C4 budget of ${COUNTDOWN_SPREAD_BUDGET_MS} ms.`,
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
        metric: {
          metricId: "watch_party.countdown_zero_spread",
          sampleCount: instants.length,
          p50: spreadMs,
          p95: spreadMs,
          p99: spreadMs,
          failures: withinBudget ? 0 : 1,
          unit: "ms" as const,
        },
      });
    } finally {
      for (const session of sessions) await session.context.close();
    }
  });

  test("CERT-WP-02 stages advance identically for host and members", async ({
    browser,
    browserName,
  }) => {
    if (!participants || !room) {
      recordM1Row("CERT-WP-02", {
        status: "unmeasured",
        detail: "Certification identities or a lobby could not be provisioned in this environment.",
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }

    // Clear the countdown armed by CERT-WP-01 so the lobby renders its journey
    // stage rather than the countdown overlay.
    const { data: current } = await participants[0]!.identity.client
      .from("rooms")
      .select("metadata")
      .eq("id", room.id)
      .maybeSingle();
    const cleared = { ...((current?.["metadata"] as Record<string, unknown> | null) ?? {}) };
    for (const key of [
      "countdown_state",
      "countdown_target_at",
      "countdown_started_at",
      "countdown_host_profile_id",
      "countdown_reason",
    ]) {
      delete cleared[key];
    }
    await participants[0]!.identity.client
      .from("rooms")
      .update({ metadata: { ...cleared, countdown_revision: 2 } })
      .eq("id", room.id);

    const sessions: SignedInSession[] = [];
    try {
      for (const participant of participants) {
        const session = await signedInContext(browser, participant, BASE_URL);
        if (!session) continue;
        await session.page.goto(`${BASE_URL}/rooms/${room.id}`, {
          waitUntil: "domcontentloaded",
        });
        sessions.push(session);
      }

      if (sessions.length < 2) {
        recordM1Row("CERT-WP-02", {
          status: "unmeasured",
          detail: "Fewer than two concurrent signed-in browsers reached the lobby.",
          profileId: "PROF-07",
          browser: browserName,
          platform: "web-desktop",
        });
        return;
      }

      const readStage = (session: SignedInSession) => () =>
        session.page.evaluate(
          () => document.querySelector("[data-sf-stage]")?.getAttribute("data-sf-stage") ?? null,
        );

      // Three members are seated, so every client — host and members alike —
      // must leave the single-occupant "invite" stage and agree on the same
      // next stage.
      const result = await measureConvergence(
        sessions.map((session, index) => ({
          label: index === 0 ? "host" : `member-${index}`,
          read: readStage(session),
        })),
        (value) => value !== null && value !== "invite",
        { timeoutMs: 45_000, pollMs: 250 },
      );

      const stages = new Set(result.samples.map((sample) => String(sample.value)));
      const identical = result.converged && stages.size === 1;

      recordM1Row("CERT-WP-02", {
        status: identical ? "pass" : "fail",
        detail: identical
          ? `Host and both members advanced past the invite stage to the identical stage "${[...stages][0]}" for a three-member room; observed spread ${result.spreadMs} ms.`
          : `Stages did not advance identically. Observations: ${JSON.stringify(
              result.samples.map((sample) => ({ label: sample.label, stage: sample.value })),
            )}.`,
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
    } finally {
      for (const session of sessions) await session.context.close();
    }
  });
});
