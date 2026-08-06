/**
 * Resilience certification — PROF-04 (network interruption) and PROF-05.
 *
 * Runs against the live app. Measures what the browser can actually observe;
 * anything it cannot observe is recorded `unmeasured`.
 */
import { test, expect } from "@playwright/test";
import { summarize, writeEvidence } from "../helpers/evidence";

test.describe("Resilience", () => {
  test("RES-01 client recovers after a simulated outage (PROF-04)", async ({
    page,
    context,
    browserName,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await context.setOffline(true);
    await page.waitForTimeout(5000);
    const startedRecovery = Date.now();
    await context.setOffline(false);
    let recovered = true;
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
    } catch {
      recovered = false;
    }
    const duration = Date.now() - startedRecovery;
    writeEvidence({
      evidenceId: `CERT-RES-01-${browserName}`,
      profileId: "PROF-04",
      browser: browserName,
      platform: process.platform,
      status: recovered ? "pass" : "fail",
      metric: summarize("outage_recovery", recovered ? [duration] : [], recovered ? 0 : 1),
      detail:
        "5s client-side outage, then reload. Measures public shell recovery only; authenticated room reconciliation remains UNMEASURED.",
    });
    expect(recovered).toBe(true);
  });

  test("RES-02 cold start of the public shell (PROF-05)", async ({ browser, browserName }) => {
    const samples: number[] = [];
    let failures = 0;
    for (let i = 0; i < 5; i += 1) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const started = Date.now();
      try {
        await page.goto("/", { waitUntil: "load", timeout: 30_000 });
        samples.push(Date.now() - started);
      } catch {
        failures += 1;
      }
      await context.close();
    }
    writeEvidence({
      evidenceId: `CERT-RES-02-${browserName}`,
      profileId: "PROF-05",
      browser: browserName,
      platform: process.platform,
      status: samples.length > 0 ? "pass" : "unmeasured",
      metric: summarize("cold_start", samples, failures),
      detail: "Cold-context first load of the public shell against the dev server. Baseline only.",
    });
    expect(samples.length).toBeGreaterThan(0);
  });
});
