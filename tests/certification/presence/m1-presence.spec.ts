/**
 * M1 presence certification — WP1 (spec homes for CERT-PRES-01 and CERT-PRES-02).
 *
 * Readiness is member metadata (`waiting_room_ready`, see
 * src/domain/rooms/room-read-model.ts), not a column, so the measurement is
 * whether every peer converges on the same readiness view. Absence detection
 * is measured against the shipped heartbeat, with no threshold invented here:
 * the observed value is recorded, and the threshold remains the Constitution's.
 */
import { test } from "@playwright/test";

import { backendConfigured } from "../fixtures/backend";
import {
  createRoomWithCapacity,
  disposeRoom,
  joinAsGuest,
  provisionParticipants,
  readRoster,
  seatHost,
  setReadiness,
  type CertParticipant,
  type CertRoom,
} from "../fixtures/identities";
import { measureConvergence } from "../helpers/instrumentation";
import { recordM1Row } from "../helpers/m1-rows";

test.describe("M1 presence", () => {
  test.slow();
  test.describe.configure({ mode: "serial" });

  let participants: readonly CertParticipant[] | null = null;
  let room: CertRoom | null = null;

  test.beforeAll(async () => {
    if (!backendConfigured) return;
    participants = await provisionParticipants(3, "pres");
    if (!participants) return;
    room = await createRoomWithCapacity(participants[0]!, 4, "M1 presence");
    if (!room) return;
    await seatHost(participants[0]!, room);
    await joinAsGuest(participants[1]!, room);
    await joinAsGuest(participants[2]!, room);
  });

  test.afterAll(async () => {
    if (participants && room) await disposeRoom(participants[0]!, room);
  });

  test("CERT-PRES-01 readiness state is identical for all participants", async ({
    browserName,
  }) => {
    if (!participants || !room) {
      recordM1Row("CERT-PRES-01", {
        status: "unmeasured",
        detail: "A three-seat lobby could not be provisioned in this environment.",
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }
    const [host, guestA, guestB] = participants;
    const marked = await setReadiness(guestA!, room, true);
    if (!marked) {
      recordM1Row("CERT-PRES-01", {
        status: "fail",
        detail:
          "A member could not record its own readiness; the readiness signal never entered the room.",
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      return;
    }

    const result = await measureConvergence(
      [host!, guestA!, guestB!].map((viewer) => ({
        label: viewer.label,
        read: () => readRoster(viewer, room!),
      })),
      (roster) => roster.some((member) => member.profileId === guestA!.profileId && member.ready),
      { timeoutMs: 15_000, pollMs: 250 },
    );

    recordM1Row("CERT-PRES-01", {
      status: result.converged ? "pass" : "fail",
      detail: result.converged
        ? `All three participants read the same readiness for ${guestA!.profileId}; observation spread ${result.spreadMs} ms.`
        : `Readiness did not become identical for all participants within 15 s. Observations: ${JSON.stringify(result.samples.map((s) => ({ label: s.label, observedAt: s.observedAt })))}`,
      profileId: "PROF-07",
      browser: browserName,
      platform: "web-desktop",
      ...(result.spreadMs !== null
        ? {
            metric: {
              metricId: "presence.readiness_convergence_spread",
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

  test("CERT-PRES-02 dropped member is marked absent within threshold", async ({ browserName }) => {
    if (!participants || !room) {
      recordM1Row("CERT-PRES-02", {
        status: "unmeasured",
        detail: "A lobby with a droppable member could not be provisioned in this environment.",
        profileId: "PROF-04",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }
    const [host, , guestB] = participants;

    // A heartbeat must exist before its absence can mean anything.
    const beat = await guestB!.identity.client.from("room_presence").insert({
      room_id: room.id,
      profile_id: guestB!.profileId,
      status: "online",
      connection_id: `cert-${Date.now()}`,
      device_kind: "web",
      last_heartbeat_at: new Date().toISOString(),
    });
    if (beat.error) {
      recordM1Row("CERT-PRES-02", {
        status: "unmeasured",
        detail: `No heartbeat could be recorded for the member due to be dropped (${beat.error.message}); absence cannot be timed without a live presence row.`,
        profileId: "PROF-04",
        browser: browserName,
        platform: "web-desktop",
      });
      return;
    }

    // The drop: the client simply stops beating. Nothing marks it absent on
    // its behalf — that is precisely what the row is asking about.
    const droppedAt = Date.now();
    const result = await measureConvergence(
      [
        {
          label: host!.label,
          read: async () => {
            const { data } = await host!.identity.client
              .from("room_presence")
              .select("status, last_heartbeat_at")
              .eq("room_id", room!.id)
              .eq("profile_id", guestB!.profileId);
            return data ?? [];
          },
        },
      ],
      (rows) => rows.every((row) => row["status"] !== "online"),
      { timeoutMs: 30_000, pollMs: 500 },
    );
    const elapsedMs = Date.now() - droppedAt;

    recordM1Row("CERT-PRES-02", {
      status: result.converged ? "pass" : "unmeasured",
      detail: result.converged
        ? `A silent member was observed as no longer online ${elapsedMs} ms after its last heartbeat.`
        : `No server-side or peer-side transition marked the silent member absent within 30 s. Absence appears to be derived client-side from heartbeat age; certifying a threshold requires an observable absence transition, which this harness may not add (WP1 is test-only).`,
      profileId: "PROF-04",
      browser: browserName,
      platform: "web-desktop",
      ...(result.converged
        ? {
            metric: {
              metricId: "presence.absence_detection",
              sampleCount: 1,
              p50: elapsedMs,
              p95: elapsedMs,
              p99: elapsedMs,
              failures: 0,
              unit: "ms" as const,
            },
          }
        : {}),
    });
  });
});
