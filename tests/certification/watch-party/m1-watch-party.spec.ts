/**
 * M1 watch-party certification — WP1 (spec homes for CERT-WP-01 and CERT-WP-02).
 *
 * Both rows depend on observing per-client countdown-zero and stage timing.
 * WP1 is a test/infrastructure sprint: it may not add production
 * instrumentation, and it may not assert a pass it did not measure. These
 * specs therefore drive the real surface, probe for an observable countdown
 * signal, and record `unmeasured` with the named missing hook when there is
 * none (unknown U-02 in M1.1 §7).
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
import { countdownTimestampProbe, measureConvergence } from "../helpers/instrumentation";
import { recordM1Row } from "../helpers/m1-rows";

const BASE_URL = process.env["CERT_BASE_URL"] ?? "http://localhost:8080";

test.describe("M1 watch party", () => {
  test.slow();
  test.describe.configure({ mode: "serial" });

  let participants: readonly CertParticipant[] | null = null;
  let room: CertRoom | null = null;
  const sessions: SignedInSession[] = [];

  test.beforeAll(async ({ browser }) => {
    if (!backendConfigured) return;
    participants = await provisionParticipants(2, "wp");
    if (!participants) return;
    room = await createRoomWithCapacity(participants[0]!, 4, "M1 watch party");
    if (!room) return;
    await seatHost(participants[0]!, room);
    await joinAsGuest(participants[1]!, room);
    for (const participant of participants) {
      const session = await signedInContext(browser, participant, BASE_URL);
      if (session) {
        await session.page.goto(`${BASE_URL}/rooms/${room.id}`, { waitUntil: "domcontentloaded" });
        sessions.push(session);
      }
    }
  });

  test.afterAll(async () => {
    for (const session of sessions) await session.context.close();
    if (participants && room) await disposeRoom(participants[0]!, room);
  });

  test("CERT-WP-01 all participants reach countdown zero within spread", async ({
    browserName,
  }) => {
    if (!participants || !room || sessions.length < 2) {
      recordM1Row("CERT-WP-01", {
        status: "unmeasured",
        detail:
          "Two concurrent signed-in participants could not be placed in one lobby in this environment.",
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }

    const probes = await Promise.all(
      sessions.map((session) => countdownTimestampProbe(session.page)),
    );
    const observable = probes.every((probe) => probe.observable);
    if (!observable) {
      recordM1Row("CERT-WP-01", {
        status: "unmeasured",
        detail: `Countdown-zero spread is not observable from the client surface. ${probes[0]!.detail} Closing this row needs a production-side countdown-zero signal, which is out of WP1 scope (test/infrastructure only).`,
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
                .querySelector("[data-countdown-zero-at]")
                ?.getAttribute("data-countdown-zero-at") ?? null,
          ),
      })),
      (value) => value !== null,
      { timeoutMs: 30_000, pollMs: 50 },
    );

    recordM1Row("CERT-WP-01", {
      status: result.converged ? "pass" : "unmeasured",
      detail: result.converged
        ? `Every participant reached countdown zero; observed spread ${result.spreadMs} ms.`
        : "A countdown-zero signal exists but no countdown ran during this measurement window.",
      profileId: "PROF-07",
      browser: browserName,
      platform: "web-desktop",
      ...(result.spreadMs !== null
        ? {
            metric: {
              metricId: "watch_party.countdown_zero_spread",
              sampleCount: result.samples.length,
              p50: result.spreadMs,
              p95: result.spreadMs,
              p99: result.spreadMs,
              failures: 0,
              unit: "ms" as const,
            },
          }
        : {}),
    });
  });

  test("CERT-WP-02 stages advance identically for host and members", async ({ browserName }) => {
    if (!participants || !room || sessions.length < 2) {
      recordM1Row("CERT-WP-02", {
        status: "unmeasured",
        detail:
          "Two concurrent signed-in participants could not be placed in one lobby in this environment.",
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }

    // Stage is server-authoritative in `room_state`; peer agreement on it is
    // measurable today, but a stage only advances when a host drives the
    // session, which needs the provider launcher WP1 must not touch.
    const result = await measureConvergence(
      participants.map((participant) => ({
        label: participant.label,
        read: async () => {
          const { data } = await participant.identity.client
            .from("room_state")
            .select("stage")
            .eq("room_id", room!.id)
            .maybeSingle();
          return (data?.["stage"] as string | undefined) ?? null;
        },
      })),
      (stage) => stage !== null,
      { timeoutMs: 10_000, pollMs: 250 },
    );

    const stages = new Set(result.samples.map((sample) => sample.value));
    const agree = result.converged && stages.size === 1;

    recordM1Row("CERT-WP-02", {
      status: "unmeasured",
      detail: agree
        ? `Host and member read the identical stage (${[...stages][0]}), but no stage advance occurred: driving an advance requires the session-start path, which WP1 (test/infrastructure) does not exercise. Stage identity is observable; stage progression remains unmeasured.`
        : `Stage progression was not measured. Peer readings: ${JSON.stringify(result.samples.map((s) => ({ label: s.label, stage: s.value })))}.`,
      profileId: "PROF-07",
      browser: browserName,
      platform: "web-desktop",
    });
  });
});
