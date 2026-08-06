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
import { documentSemantics, movingElements, unnamedControls } from "../helpers/instrumentation";
import { recordM1Row } from "../helpers/m1-rows";

const BASE_URL = process.env["CERT_BASE_URL"] ?? "http://localhost:8080";

/**
 * WP10 — every launch surface in the frozen Launch Envelope, split by the
 * session each one needs. `/home` moves to the authenticated list: visiting it
 * signed out only measures the auth gate, not the surface itself.
 */
const PUBLIC_SURFACES = [
  "/",
  "/auth",
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
] as const;

const AUTHENTICATED_SURFACES = [
  "/home",
  "/people",
  "/invites",
  "/share",
  "/account",
  "/settings",
  "/onboarding",
] as const;

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

    // Only success criteria a machine can decide: 4.1.2 (accessible name on
    // every control), 3.1.1 (page language) and 2.4.2 (page title).
    const audit = async (label: string, target: typeof page): Promise<void> => {
      visited.push(label);
      const unnamed = await unnamedControls(target);
      const semantics = await documentSemantics(target);
      if (unnamed.length > 0)
        findings.push(
          `${label}: ${unnamed.length} control(s) without an accessible name (WCAG 4.1.2)`,
        );
      if (semantics.lang.trim().length === 0)
        findings.push(`${label}: no lang on <html> (WCAG 3.1.1)`);
      if (semantics.title.trim().length === 0)
        findings.push(`${label}: empty document title (WCAG 2.4.2)`);
    };

    for (const surface of PUBLIC_SURFACES) {
      await page.goto(`${BASE_URL}${surface}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      await audit(surface, page);
    }
    await context.close();

    const uncovered: string[] = [];
    if (participants && room) {
      const session = await signedInContext(browser, participants[0]!, BASE_URL);
      if (session) {
        for (const surface of AUTHENTICATED_SURFACES) {
          await session.page.goto(`${BASE_URL}${surface}`, { waitUntil: "domcontentloaded" });
          await session.page.waitForTimeout(900);
          await audit(surface, session.page);
        }
        await session.page.goto(`${BASE_URL}/rooms/${room.id}`, { waitUntil: "domcontentloaded" });
        await session.page.waitForTimeout(1200);
        await audit("/rooms/:roomId", session.page);
        await session.context.close();
      } else {
        uncovered.push(...AUTHENTICATED_SURFACES, "/rooms/:roomId");
      }
    } else {
      uncovered.push(...AUTHENTICATED_SURFACES, "/rooms/:roomId");
    }

    // A clean automated sweep is a necessary condition, never a sufficient one:
    // contrast, focus order and screen-reader semantics remain PROF-09 manual.
    recordM1Row("CERT-EXP-01", {
      status: findings.length === 0 ? "unmeasured" : "fail",
      detail:
        findings.length === 0
          ? `The automatable subset (WCAG 4.1.2, 3.1.1, 2.4.2) is clean across ${visited.length} launch surfaces: ${visited.join(", ")}.${uncovered.length > 0 ? ` Not reachable in this environment: ${uncovered.join(", ")}.` : ""} Blocker to a pass: WCAG 2.1 AA also requires contrast, focus order and screen-reader review under PROF-09, which is a manual audit (docs/blueprint/K-launch-certification.md); automation alone cannot promote this row.`
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

    const unreached: string[] = [];
    if (participants && room) {
      const session = await signedInContext(browser, participants[0]!, BASE_URL, {
        reducedMotion: "reduce",
      });
      if (session) {
        for (const surface of AUTHENTICATED_SURFACES) {
          await session.page.goto(`${BASE_URL}${surface}`, { waitUntil: "domcontentloaded" });
          await session.page.waitForTimeout(900);
          visited.push(surface);
          const moving = await movingElements(session.page);
          if (moving.length > 0) offenders.push(`${surface}: ${moving.join(" | ")}`);
        }
        await session.page.goto(`${BASE_URL}/rooms/${room.id}`, { waitUntil: "domcontentloaded" });
        await session.page.waitForTimeout(1500);
        visited.push("/rooms/:roomId");
        const moving = await movingElements(session.page);
        if (moving.length > 0) offenders.push(`/rooms/:roomId: ${moving.join(" | ")}`);
        await session.context.close();
      } else {
        unreached.push(...AUTHENTICATED_SURFACES, "/rooms/:roomId");
      }
    } else {
      unreached.push(...AUTHENTICATED_SURFACES, "/rooms/:roomId");
    }

    recordM1Row("CERT-EXP-02", {
      status: offenders.length === 0 ? (unreached.length === 0 ? "pass" : "unmeasured") : "fail",
      detail:
        offenders.length === 0
          ? unreached.length === 0
            ? `With prefers-reduced-motion: reduce, no element on any of the ${visited.length} launch surfaces (${visited.join(", ")}) retained a perceptible animation or transition.`
            : `With prefers-reduced-motion: reduce, ${visited.join(", ")} were clean, but ${unreached.join(", ")} could not be reached in this environment, so full-surface conformance is unmeasured rather than passed.`
          : `Motion continued despite the OS preference: ${offenders.join(" || ")}`,
      profileId: "PROF-09",
      browser: browserName,
      platform: "web-desktop",
    });
  });
});
