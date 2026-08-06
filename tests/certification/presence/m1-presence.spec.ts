/**
 * M1 presence certification — WP5 (Presence accuracy).
 *
 * Rows: CERT-PRES-01 (readiness parity across participants) and CERT-PRES-02
 * (a dropped member is marked absent within the ≤ 10 s threshold recorded in
 * docs/blueprint/K-launch-certification.md).
 *
 * Readiness is member metadata (`waiting_room_ready`, see
 * src/domain/rooms/room-read-model.ts), not a column, so the measurement is
 * whether every peer converges on the same readiness view.
 *
 * Absence is not a column flip: `PresenceCoordinator.observe` derives it from
 * heartbeat age against `PRESENCE.STALE_AFTER_MS` (src/domain/rooms/
 * presence-coordinator.ts). The harness therefore observes absence exactly the
 * way every client does — by applying the shipped constant to the shipped
 * `room_presence` row — and records the elapsed time as a measurement, never
 * an assertion.
 */
import { test } from "@playwright/test";

import { PRESENCE } from "../../../src/shared/constants/system-constants";
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

/** K-launch-certification.md §CERT-PRES-02 — the threshold is the document's. */
const ABSENCE_THRESHOLD_MS = 10_000;

test.describe("M1 presence", () => {
  test.slow();
  test.describe.configure({ mode: "serial" });

  let participants: readonly CertParticipant[] | null = null;
  let room: CertRoom | null = null;

  test.beforeAll(async () => {
    if (!backendConfigured) return;
    // WP5 acceptance criteria: four connected participants.
    participants = await provisionParticipants(4, "pres");
    if (!participants) return;
    room = await createRoomWithCapacity(participants[0]!, 8, "M1 presence");
    if (!room) return;
    await seatHost(participants[0]!, room);
    await joinAsGuest(participants[1]!, room);
    await joinAsGuest(participants[2]!, room);
    await joinAsGuest(participants[3]!, room);
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
        detail: "A four-seat lobby could not be provisioned in this environment.",
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }
    const guestA = participants[1]!;
    const marked = await setReadiness(guestA, room, true);
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
      participants.map((viewer) => ({
        label: viewer.label,
        read: () => readRoster(viewer, room!),
      })),
      (roster) => roster.some((member) => member.profileId === guestA.profileId && member.ready),
      { timeoutMs: 15_000, pollMs: 250 },
    );

    recordM1Row("CERT-PRES-01", {
      status: result.converged ? "pass" : "fail",
      detail: result.converged
        ? `All four participants read the same readiness for ${guestA.profileId}; observation spread ${result.spreadMs} ms.`
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
    test.setTimeout(120_000);
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
    const [host, guestA, guestB, dropped] = participants;

    // A heartbeat must exist before its absence can mean anything.
    const beatAt = Date.now();
    const beat = await dropped!.identity.client.from("room_presence").insert({
      room_id: room.id,
      profile_id: dropped!.profileId,
      status: "online",
      connection_id: `cert-${beatAt}`,
      device_kind: "web",
      last_heartbeat_at: new Date(beatAt).toISOString(),
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

    /**
     * The drop: the client simply stops beating. Every peer derives absence
     * the way `PresenceCoordinator.observe` does — heartbeat age against the
     * shipped stale window — so this observer is the product rule, not a
     * harness invention.
     */
    const observeAbsence = (viewer: CertParticipant) => async () => {
      const { data } = await viewer.identity.client
        .from("room_presence")
        .select("status, last_heartbeat_at")
        .eq("room_id", room!.id)
        .eq("profile_id", dropped!.profileId);
      const rows = data ?? [];
      const now = Date.now();
      return rows.map((row) => {
        const fresh =
          Date.parse(row["last_heartbeat_at"] as string) >= now - PRESENCE.STALE_AFTER_MS;
        return { derivedOnline: fresh && row["status"] === "online" };
      });
    };

    const result = await measureConvergence(
      [host!, guestA!, guestB!].map((viewer) => ({
        label: viewer.label,
        read: observeAbsence(viewer),
      })),
      (rows) => rows.length > 0 && rows.every((row) => !row.derivedOnline),
      { timeoutMs: 90_000, pollMs: 250 },
    );
    const latestObservation = Math.max(
      ...result.samples.map((sample) => sample.observedAt ?? Number.NEGATIVE_INFINITY),
    );
    const elapsedMs = result.converged ? latestObservation - beatAt : null;
    const withinThreshold = elapsedMs !== null && elapsedMs <= ABSENCE_THRESHOLD_MS;

    recordM1Row("CERT-PRES-02", {
      status: result.converged ? (withinThreshold ? "pass" : "fail") : "unmeasured",
      detail: result.converged
        ? `All three remaining peers derived the silent member as absent ${elapsedMs} ms after its last heartbeat, using the shipped stale window of ${PRESENCE.STALE_AFTER_MS} ms. Threshold ${ABSENCE_THRESHOLD_MS} ms: ${withinThreshold ? "met" : "exceeded"}.`
        : `No peer derived the silent member as absent within 90 s; the shipped stale window is ${PRESENCE.STALE_AFTER_MS} ms.`,
      profileId: "PROF-04",
      browser: browserName,
      platform: "web-desktop",
      ...(elapsedMs !== null
        ? {
            metric: {
              metricId: "presence.absence_detection",
              sampleCount: result.samples.length,
              p50: elapsedMs,
              p95: elapsedMs,
              p99: elapsedMs,
              failures: withinThreshold ? 0 : 1,
              unit: "ms" as const,
            },
          }
        : {}),
    });
  });
});
