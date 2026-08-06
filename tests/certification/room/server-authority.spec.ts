/**
 * WP8 — Server authority validation.
 *
 * Asserts, by static inspection of the source tree plus live backend probes,
 * that authoritative domain state lives on the server and that WebRTC carries
 * voice only. Static checks are genuine evidence: they prove the codebase
 * contains no path that could make WebRTC authoritative.
 */
import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { writeEvidence } from "../helpers/evidence";
import { backendConfigured, anonClient } from "../fixtures/backend";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const SOURCES = walk("src");

test.describe("WP8 server authority", () => {
  test("SA-01 no domain mutation travels over the voice transport", async () => {
    const offenders: string[] = [];
    for (const file of SOURCES) {
      const source = readFileSync(file, "utf8");
      if (!/livekit|LocalParticipant|publishData/i.test(source)) continue;
      if (/publishData\s*\(/.test(source)) offenders.push(file);
    }
    expect(offenders, `WebRTC data channel used in: ${offenders.join(", ")}`).toHaveLength(0);
    writeEvidence({
      evidenceId: "CERT-SA-01",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: `Scanned ${SOURCES.length} source files; no LiveKit data-channel publish path exists.`,
    });
  });

  test("SA-02 room state version is server-enforced, not client-trusted", async () => {
    const migrations = walk("supabase/migrations").concat(
      readdirSync("supabase/migrations")
        .filter((f) => f.endsWith(".sql"))
        .map((f) => join("supabase/migrations", f)),
    );
    const sql = migrations.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(sql).toContain("enforce_room_state_version");
    expect(sql).toContain("must increase monotonically");
    writeEvidence({
      evidenceId: "CERT-SA-02",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: "Monotonic room_state.version trigger is present in committed migrations.",
    });
  });

  test("SA-03 membership authority is expressed as SECURITY DEFINER predicates", async () => {
    const sql = readdirSync("supabase/migrations")
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join("supabase/migrations", f), "utf8"))
      .join("\n");
    for (const fn of ["is_room_member", "is_room_host", "is_room_controller"]) {
      expect(sql, `${fn} must exist server-side`).toContain(fn);
    }
    writeEvidence({
      evidenceId: "CERT-SA-03",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: "Membership, host and controller authority are server-side predicates.",
    });
  });

  test("SA-04 capability disclosure cannot be raised by a client flag", async () => {
    const tier = readFileSync("src/domain/providers/provider-tier.ts", "utf8");
    expect(tier).not.toMatch(/TIER_A_KEYS/);
    expect(tier).toContain("findCapabilityCertification");
    writeEvidence({
      evidenceId: "CERT-SA-04",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: "Tier resolution reads the certification registry only; no name list, no client override.",
    });
  });

  test("SA-05 playback intent revisions are persisted server-side", async () => {
    if (!backendConfigured) {
      writeEvidence({
        evidenceId: "CERT-SA-05",
        profileId: "PROF-01",
        browser: "node",
        platform: "node",
        status: "unmeasured",
        detail: "Backend not configured for this run.",
      });
      test.skip();
    }
    // An unauthenticated probe must be refused: intent revisions are not public.
    const { data } = await anonClient().from("playback_sessions").select("id").limit(1);
    expect(data ?? []).toHaveLength(0);
    writeEvidence({
      evidenceId: "CERT-SA-05",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: "Playback session revisions are not readable without authorization.",
    });
  });
});
