/**
 * WP4 — Performance baselines (measured, never fabricated).
 *
 * Five metrics. Each records a full provenance row. Where the environment
 * cannot produce a sample, the row is written with status `unmeasured` and a
 * reason. These are MEASURED BASELINES, not certified thresholds.
 */
import { test, expect } from "@playwright/test";
import { summarize, writeEvidence } from "../helpers/evidence";
import {
  backendConfigured,
  anonClient,
  provisionIdentity,
  profileIdFor,
  type CertIdentity,
} from "../fixtures/backend";

const SAMPLES = 10;

function unmeasured(evidenceId: string, metricId: string, reason: string): void {
  writeEvidence({
    evidenceId,
    profileId: "PROF-01",
    browser: "node",
    platform: "node",
    status: "unmeasured",
    metric: summarize(metricId, [], 0),
    detail: reason,
  });
}

test.describe("WP4 measured baselines", () => {
  test.slow();

  test("PERF-04 clock offset (client vs server authoritative time)", async () => {
    if (!backendConfigured) {
      unmeasured("CERT-PERF-04", "clock_offset", "Backend not configured.");
      test.skip();
    }
    const offsets: number[] = [];
    let failures = 0;
    for (let i = 0; i < SAMPLES; i += 1) {
      const sent = Date.now();
      const response = await fetch(`${process.env["VITE_SUPABASE_URL"] ?? ""}/auth/v1/health`).catch(
        () => null,
      );
      const received = Date.now();
      const serverDate = response?.headers.get("date");
      if (!serverDate) {
        failures += 1;
        continue;
      }
      const serverTime = new Date(serverDate).getTime();
      const midpoint = sent + (received - sent) / 2;
      offsets.push(Math.abs(serverTime - midpoint));
    }
    if (offsets.length === 0) {
      unmeasured("CERT-PERF-04", "clock_offset", "No server Date header observed.");
      test.skip();
    }
    writeEvidence({
      evidenceId: "CERT-PERF-04",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      metric: summarize("clock_offset", offsets, failures),
      detail:
        "Absolute offset between local clock and server Date header, HTTP-midpoint estimated. Second-granularity header caps resolution at ~1000ms.",
    });
    expect(offsets.length).toBeGreaterThan(0);
  });

  test("PERF-02 ready propagation (realtime broadcast round trip)", async () => {
    if (!backendConfigured) {
      unmeasured("CERT-PERF-02", "ready_propagation", "Backend not configured.");
      test.skip();
    }
    const publisher = anonClient();
    const subscriber = anonClient();
    const topic = `cert-ready-${Date.now()}`;
    const latencies: number[] = [];
    let failures = 0;

    const subChannel = subscriber.channel(topic, { config: { broadcast: { self: false } } });
    const arrivals: number[] = [];
    subChannel.on("broadcast", { event: "ready" }, () => arrivals.push(Date.now()));
    const subscribed = await new Promise<boolean>((resolve) => {
      subChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve(true);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") resolve(false);
      });
      setTimeout(() => resolve(false), 15_000);
    });
    if (!subscribed) {
      unmeasured("CERT-PERF-02", "ready_propagation", "Realtime subscription did not establish.");
      test.skip();
    }

    const pubChannel = publisher.channel(topic);
    await new Promise<void>((resolve) => {
      pubChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
      });
      setTimeout(resolve, 15_000);
    });

    for (let i = 0; i < SAMPLES; i += 1) {
      const before = arrivals.length;
      const sent = Date.now();
      await pubChannel.send({ type: "broadcast", event: "ready", payload: { i } });
      const arrived = await new Promise<boolean>((resolve) => {
        const started = Date.now();
        const timer = setInterval(() => {
          if (arrivals.length > before) {
            clearInterval(timer);
            resolve(true);
          } else if (Date.now() - started > 5000) {
            clearInterval(timer);
            resolve(false);
          }
        }, 5);
      });
      if (arrived) latencies.push(arrivals[arrivals.length - 1]! - sent);
      else failures += 1;
    }
    await subscriber.removeAllChannels();
    await publisher.removeAllChannels();

    if (latencies.length === 0) {
      unmeasured("CERT-PERF-02", "ready_propagation", "No broadcast round trip completed.");
      test.skip();
    }
    writeEvidence({
      evidenceId: "CERT-PERF-02",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      metric: summarize("ready_propagation", latencies, failures),
      detail:
        "Realtime broadcast publish→receive latency between two independent clients. Transport-level baseline; excludes UI render time.",
    });
    expect(latencies.length).toBeGreaterThan(0);
  });

  test("PERF-03 countdown spread (two subscribers receiving one start signal)", async () => {
    if (!backendConfigured) {
      unmeasured("CERT-PERF-03", "countdown_spread", "Backend not configured.");
      test.skip();
    }
    const publisher = anonClient();
    const a = anonClient();
    const b = anonClient();
    const topic = `cert-countdown-${Date.now()}`;
    const seenA: number[] = [];
    const seenB: number[] = [];

    async function join(client: ReturnType<typeof anonClient>, sink: number[]) {
      const channel = client.channel(topic, { config: { broadcast: { self: false } } });
      channel.on("broadcast", { event: "start" }, () => sink.push(Date.now()));
      return new Promise<boolean>((resolve) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve(true);
        });
        setTimeout(() => resolve(false), 15_000);
      });
    }

    const ok = (await join(a, seenA)) && (await join(b, seenB));
    if (!ok) {
      unmeasured("CERT-PERF-03", "countdown_spread", "Subscribers did not both establish.");
      test.skip();
    }
    const pub = publisher.channel(topic);
    await new Promise<void>((resolve) => {
      pub.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
      });
      setTimeout(resolve, 15_000);
    });

    const spreads: number[] = [];
    let failures = 0;
    for (let i = 0; i < SAMPLES; i += 1) {
      const beforeA = seenA.length;
      const beforeB = seenB.length;
      await pub.send({ type: "broadcast", event: "start", payload: { i } });
      const both = await new Promise<boolean>((resolve) => {
        const started = Date.now();
        const timer = setInterval(() => {
          if (seenA.length > beforeA && seenB.length > beforeB) {
            clearInterval(timer);
            resolve(true);
          } else if (Date.now() - started > 5000) {
            clearInterval(timer);
            resolve(false);
          }
        }, 5);
      });
      if (both) spreads.push(Math.abs(seenA[seenA.length - 1]! - seenB[seenB.length - 1]!));
      else failures += 1;
    }
    await a.removeAllChannels();
    await b.removeAllChannels();
    await publisher.removeAllChannels();

    if (spreads.length === 0) {
      unmeasured("CERT-PERF-03", "countdown_spread", "No paired delivery observed.");
      test.skip();
    }
    writeEvidence({
      evidenceId: "CERT-PERF-03",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      metric: summarize("countdown_spread", spreads, failures),
      detail:
        "Delivery-time spread of one start signal across two independent subscribers on one host. Single-host measurement understates real-world spread.",
    });
    expect(spreads.length).toBeGreaterThan(0);
  });

  test("PERF-05 reconnect recovery (realtime resubscribe after forced close)", async () => {
    if (!backendConfigured) {
      unmeasured("CERT-PERF-05", "reconnect_recovery", "Backend not configured.");
      test.skip();
    }
    const durations: number[] = [];
    let failures = 0;
    for (let i = 0; i < 5; i += 1) {
      const client = anonClient();
      const channel = client.channel(`cert-reconnect-${Date.now()}-${i}`);
      const started = Date.now();
      const ok = await new Promise<boolean>((resolve) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve(true);
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") resolve(false);
        });
        setTimeout(() => resolve(false), 15_000);
      });
      if (ok) durations.push(Date.now() - started);
      else failures += 1;
      await client.removeAllChannels();
    }
    if (durations.length === 0) {
      unmeasured("CERT-PERF-05", "reconnect_recovery", "No channel re-established.");
      test.skip();
    }
    writeEvidence({
      evidenceId: "CERT-PERF-05",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      metric: summarize("reconnect_recovery", durations, failures),
      detail:
        "Cold realtime channel establishment time (proxy for post-outage resubscribe). Full client reconnect+reconcile remains UNMEASURED pending PROF-04 UI runs.",
    });
    expect(durations.length).toBeGreaterThan(0);
  });

  test("PERF-01 invite-to-join (end-to-end, requires provisionable identities)", async () => {
    if (!backendConfigured) {
      unmeasured("CERT-PERF-01", "invite_to_join", "Backend not configured.");
      test.skip();
    }
    const host: CertIdentity | null = await provisionIdentity("perf-host");
    if (!host) {
      unmeasured(
        "CERT-PERF-01",
        "invite_to_join",
        "Identity provisioning unavailable (sign-up closed or confirmation required). Metric remains UNKNOWN.",
      );
      test.skip();
    }
    const hostProfileId = await profileIdFor(host!);
    if (!hostProfileId) {
      unmeasured("CERT-PERF-01", "invite_to_join", "Profile provisioning did not complete.");
      test.skip();
    }
    const guest = await provisionIdentity("perf-guest");
    if (!guest) {
      unmeasured("CERT-PERF-01", "invite_to_join", "Second identity unavailable.");
      test.skip();
    }

    const durations: number[] = [];
    let failures = 0;
    for (let i = 0; i < 5; i += 1) {
      const started = Date.now();
      const { data: room } = await host!.client
        .from("rooms")
        .insert({ name: `perf-${i}`, host_profile_id: hostProfileId, status: "lobby", max_members: 4 })
        .select("id, code")
        .maybeSingle();
      if (!room?.["code"]) {
        failures += 1;
        continue;
      }
      const { data: discovered } = await guest!.client.rpc("discover_room_by_code", {
        _code: room["code"],
      });
      if (!discovered || (Array.isArray(discovered) && discovered.length === 0)) {
        failures += 1;
        continue;
      }
      durations.push(Date.now() - started);
    }
    if (durations.length === 0) {
      unmeasured(
        "CERT-PERF-01",
        "invite_to_join",
        `No invite-to-join cycle completed (${failures} failures). Metric remains UNKNOWN.`,
      );
      test.skip();
    }
    writeEvidence({
      evidenceId: "CERT-PERF-01",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      metric: summarize("invite_to_join", durations, failures),
      detail:
        "Room creation → guest code discovery, backend path only. UI-inclusive invite-to-join remains UNMEASURED.",
    });
    expect(durations.length).toBeGreaterThan(0);
  });
});
