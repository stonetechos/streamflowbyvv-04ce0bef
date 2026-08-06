/**
 * M1 experience certification — WP1 (CERT-EXP-01, CERT-EXP-02).
 *
 * CERT-EXP-01 asks for WCAG 2.1 AA across all launch surfaces. Automation can
 * only decide a subset; the rest is PROF-09's manual work. This spec therefore
 * measures the automatable subset across the M1 surface list and records the
 * row honestly: a clean automated sweep is not, on its own, a WCAG AA pass.
 *
 * CERT-EXP-02 is fully automatable: the OS motion preference is set at context
 * level and the surfaces are inspected for still-running motion.
 */
import { test } from "@playwright/test";

import { backendConfigured } from "../fixtures/backend";
import {
  createRoomWithCapacity,
  disposeRoom,
  provisionParticipants,
  seatHost,
  signedInContext,
  type CertParticipant,
  type CertRoom,
} from "../fixtures/identities";
import { movingElements, unnamedControls } from "../helpers/instrumentation";
import { recordM1Row } from "../helpers/m1-rows";

const BASE_URL = process.env["CERT_BASE_URL"] ?? "http://localhost:8080";

/** The public launch surfaces; the room surface is appended when reachable. */
const PUBLIC_SURFACES = ["/", "/auth", "/home"] as const;

test.describe("M1 experience", () => {
  test.slow();
  test.describe.configure({ mode: "serial" });

  let participants: readonly CertParticipant[] | null = null;
  let room: CertRoom | null = null;

  test.beforeAll(async () => {
    if (!backendConfigured) return;
    participants = await provisionParticipants(1, "exp");
    if (!participants) return;
    room = await createRoomWithCapacity(participants[0]!, 4, "M1 experience");
    if (room) await seatHost(participants[0]!, room);
  });

  test.afterAll(async () => {
    if (participants && room) await disposeRoom(participants[0]!, room);
  });

  test("CERT-EXP-01 automatable WCAG subset across launch surfaces", async ({
    browser,
    browserName,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const findings: string[] = [];
    const visited: string[] = [];

    for (const surface of PUBLIC_SURFACES) {
      await page.goto(`${BASE_URL}${surface}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      visited.push(surface);
      const unnamed = await unnamedControls(page);
      const headings = await page.locator("h1").count();
      if (unnamed.length > 0)
        findings.push(`${surface}: ${unnamed.length} control(s) without an accessible name`);
      if (headings !== 1) findings.push(`${surface}: ${headings} h1 element(s)`);
    }
    await context.close();

    if (participants && room) {
      const session = await signedInContext(browser, participants[0]!, BASE_URL);
      if (session) {
        await session.page.goto(`${BASE_URL}/rooms/${room.id}`, { waitUntil: "domcontentloaded" });
        await session.page.waitForTimeout(1200);
        visited.push("/rooms/:roomId");
        const unnamed = await unnamedControls(session.page);
        if (unnamed.length > 0)
          findings.push(`/rooms/:roomId: ${unnamed.length} control(s) without an accessible name`);
        await session.context.close();
      }
    }

    // A clean automated sweep is a necessary condition, never a sufficient one:
    // contrast, focus order and screen-reader semantics remain PROF-09 manual.
    recordM1Row("CERT-EXP-01", {
      status: findings.length === 0 ? "unmeasured" : "fail",
      detail:
        findings.length === 0
          ? `The automatable subset (accessible names, single-h1) is clean across ${visited.join(", ")}. WCAG 2.1 AA also requires contrast, focus order and screen-reader review under PROF-09 (manual); this row cannot pass on automation alone.`
          : `Automated accessibility findings on launch surfaces: ${findings.join("; ")}.`,
      profileId: "PROF-09",
      browser: browserName,
      platform: "web-desktop",
    });
  });

  test("CERT-EXP-02 motion respects the OS preference everywhere", async ({
    browser,
    browserName,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const offenders: string[] = [];
    const visited: string[] = [];

    for (const surface of PUBLIC_SURFACES) {
      await page.goto(`${BASE_URL}${surface}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      visited.push(surface);
      const moving = await movingElements(page);
      if (moving.length > 0) offenders.push(`${surface}: ${moving.join(" | ")}`);
    }
    await context.close();

    if (participants && room) {
      const session = await signedInContext(browser, participants[0]!, BASE_URL, {
        reducedMotion: "reduce",
      });
      if (session) {
        await session.page.goto(`${BASE_URL}/rooms/${room.id}`, { waitUntil: "domcontentloaded" });
        await session.page.waitForTimeout(1500);
        visited.push("/rooms/:roomId");
        const moving = await movingElements(session.page);
        if (moving.length > 0) offenders.push(`/rooms/:roomId: ${moving.join(" | ")}`);
        await session.context.close();
      }
    }

    recordM1Row("CERT-EXP-02", {
      status: offenders.length === 0 ? "pass" : "fail",
      detail:
        offenders.length === 0
          ? `With prefers-reduced-motion: reduce, no element on ${visited.join(", ")} retained a running animation or a non-zero transition.`
          : `Motion continued despite the OS preference: ${offenders.join(" || ")}`,
      profileId: "PROF-09",
      browser: browserName,
      platform: "web-desktop",
    });
  });
});
