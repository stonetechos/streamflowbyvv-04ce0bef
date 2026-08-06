/**
 * M1 Tier C sync certification — CERT-SYNC-C-01 (WP7) and CERT-SYNC-C-02 (WP8).
 *
 * Tier C is coordinated manual sync. The row's decisive clause is "no false
 * sync UI": ADR-014 forbids any affordance that implies the app can drive
 * playback in a provider. That claim is measured here on the real host journey.
 *
 * WP8 makes the web-mobile row executable rather than merely absent: the same
 * measurement runs whenever the harness is invoked under a project named
 * `web-mobile`. No such project exists in `playwright.config.ts` yet — adding
 * one is a harness-configuration decision awaiting a governance ruling on the
 * M0.5 Constitutional Limit (I.13) — so until then the row records `blocked`
 * naming the missing environment, exactly as the frozen acceptance criterion
 * for WP8 requires.
 */
import { test, type Browser } from "@playwright/test";

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
import { recordM1Row } from "../helpers/m1-rows";

const BASE_URL = process.env["CERT_BASE_URL"] ?? "http://localhost:8080";

/** Playwright project that gives `CERT-SYNC-C-02` an execution environment. */
const WEB_MOBILE_PROJECT = "web-mobile";

/** Controls that would falsely imply StreamFlow drives provider playback. */
const FALSE_SYNC_AFFORDANCES = [
  'input[type="range"]',
  "video",
  '[role="slider"]',
  '[aria-label*="seek" i]',
  '[aria-label*="scrub" i]',
  '[aria-label*="play" i]',
  '[aria-label*="pause" i]',
];

interface TierCMeasurement {
  readonly rowId: "CERT-SYNC-C-01" | "CERT-SYNC-C-02";
  readonly platform: "web-desktop" | "web-mobile";
  readonly browser: Browser;
  readonly browserName: string;
  readonly participant: CertParticipant;
  readonly room: CertRoom;
}

/**
 * One Tier C hand-off measurement, shared by the desktop and mobile rows so the
 * two surfaces are held to an identical standard rather than two definitions.
 */
async function measureTierCHandoff(input: TierCMeasurement): Promise<void> {
  const { rowId, platform, browser, browserName, participant, room } = input;

  const session = await signedInContext(browser, participant, BASE_URL);
  if (!session) {
    recordM1Row(rowId, {
      status: "unmeasured",
      detail: "No transplantable host session; the room surface was not inspected.",
      browser: browserName,
      platform,
    });
    return;
  }

  const { page, context } = session;
  await page.goto(`${BASE_URL}/rooms/${room.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-sf-screen="waiting-room"]', { timeout: 30_000 });

  // The host picks a provider the way a real host does: through the lobby
  // radiogroup, not by writing the room row behind the UI. Setup lives behind
  // the "Room details" disclosure since the UX simplification pass.
  const details = page.getByRole("button", { name: "Room details" });
  if ((await details.count()) > 0) await details.first().click();
  const choices = page.locator('[role="radiogroup"] [role="radio"]:not([disabled])');
  try {
    await choices.first().waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    // Fall through: an empty catalog is recorded as unmeasured below.
  }
  const choiceCount = await choices.count();
  if (choiceCount === 0) {
    await context.close();
    recordM1Row(rowId, {
      status: "unmeasured",
      detail:
        "The lobby offered no selectable provider, so no Tier C launch could be exercised. No claim is made about the launch path.",
      browser: browserName,
      platform,
    });
    return;
  }
  await choices.first().click();

  const panel = page.locator("[data-sf-launch-panel]");
  let panelVisible = true;
  try {
    await panel.waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    panelVisible = false;
  }
  if (!panelVisible) {
    await context.close();
    recordM1Row(rowId, {
      status: "fail",
      detail:
        "After a provider was selected the lobby rendered no launch panel, so the room has no hand-off route to the provider.",
      browser: browserName,
      platform,
    });
    return;
  }

  const launchClass = await panel.getAttribute("data-sf-launch-class");
  const manualPlay = (await panel.getAttribute("data-sf-launch-manual")) === "true";

  // Capture the hand-off instead of performing it: the certification run
  // must not navigate to a third-party provider, and StreamFlow only ever
  // claims that the platform accepted the request (ADR-014).
  await page.evaluate(() => {
    const store: string[] = [];
    (window as unknown as { __sfLaunches: string[] }).__sfLaunches = store;
    window.open = ((url?: string | URL) => {
      store.push(String(url ?? ""));
      return null;
    }) as typeof window.open;
  });

  const primary = panel.locator('[data-sf-launch-primary="true"]').first();
  const hasPrimary = (await primary.count()) > 0 && (await primary.isEnabled());
  if (hasPrimary) await primary.click();
  await page.waitForTimeout(500);

  const launched = await page.evaluate(
    () => (window as unknown as { __sfLaunches?: string[] }).__sfLaunches ?? [],
  );
  const launchStatus = await panel.getAttribute("data-sf-launch-status");

  const offenders: string[] = [];
  for (const selector of FALSE_SYNC_AFFORDANCES) {
    const count = await page.locator(selector).count();
    if (count > 0) offenders.push(`${selector} ×${count}`);
  }
  const url = page.url();
  await context.close();

  const reachedRoom = new RegExp(`/rooms/${room.id}`).test(url);
  const target = launched[0] ?? "";
  const external = /^https?:/i.test(target)
    ? !target.startsWith(new URL(BASE_URL).origin)
    : /^[a-z][a-z0-9+.-]*:/i.test(target);
  const tierCClass = launchClass === "manual_sync" || launchClass === "deep_link";
  const clean =
    reachedRoom &&
    hasPrimary &&
    launched.length === 1 &&
    external &&
    tierCClass &&
    manualPlay &&
    offenders.length === 0;

  const reasons: string[] = [];
  if (!reachedRoom) reasons.push(`the room did not open (landed at ${url})`);
  if (!hasPrimary) reasons.push("the launch panel offered no enabled primary destination");
  if (launched.length !== 1) reasons.push(`the launch produced ${launched.length} hand-offs`);
  else if (!external) reasons.push(`the hand-off target was not external (${target})`);
  if (!tierCClass) reasons.push(`the launch class was "${launchClass}", not a Tier C hand-off`);
  if (!manualPlay) reasons.push("the panel did not require manual play");
  if (offenders.length > 0)
    reasons.push(`playback-control affordances are rendered: ${offenders.join(", ")}`);

  recordM1Row(rowId, {
    status: clean ? "pass" : "fail",
    detail: clean
      ? `A Tier C provider selected in the lobby produced a "${launchClass}" plan whose primary destination handed off exactly one external deep link (${target}); the panel then reported status "${launchStatus}" and required manual play. The room surface exposes no transport, scrubber, or play/pause affordance, so no provider control is implied (ADR-014). Countdown coordination itself is measured by CERT-WP-01.`
      : `Tier C coordination is not correct: ${reasons.join("; ")}.`,
    browser: browserName,
    platform,
  });
}

test.describe("M1 Tier C sync", () => {
  test.slow();
  test.describe.configure({ mode: "serial" });

  let participants: readonly CertParticipant[] | null = null;
  let room: CertRoom | null = null;

  test.beforeAll(async () => {
    if (!backendConfigured) return;
    participants = await provisionParticipants(1, "sync");
    if (!participants) return;
    room = await createRoomWithCapacity(participants[0]!, 4, "M1 Tier C");
    if (room) await seatHost(participants[0]!, room);
  });

  test.afterAll(async () => {
    if (participants && room) await disposeRoom(participants[0]!, room);
  });

  test("CERT-SYNC-C-01 deep link opens, countdown coordinates, no false sync UI", async ({
    browser,
    browserName,
  }) => {
    if (!participants || !room) {
      recordM1Row("CERT-SYNC-C-01", {
        status: "unmeasured",
        detail: "A Tier C room could not be provisioned in this environment.",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }
    await measureTierCHandoff({
      rowId: "CERT-SYNC-C-01",
      platform: "web-desktop",
      browser,
      browserName,
      participant: participants[0]!,
      room,
    });
  });

  test("CERT-SYNC-C-02 same guarantee on web-mobile", async ({
    browser,
    browserName,
  }, testInfo) => {
    // The row is executable; only its environment is missing. When the harness
    // is run under a `web-mobile` project the identical desktop measurement is
    // applied to the mobile viewport. Otherwise the row is `blocked`, never
    // passed by assumption — a mobile Tier C claim needs a mobile run.
    if (testInfo.project.name !== WEB_MOBILE_PROJECT) {
      recordM1Row("CERT-SYNC-C-02", {
        status: "blocked",
        detail: `Blocker: no \`${WEB_MOBILE_PROJECT}\` Playwright project exists in playwright.config.ts, so the row has no mobile execution environment; it ran under \`${testInfo.project.name}\`. The measurement itself is implemented and runs unchanged as soon as that project exists (smallest change: one project entry with a mobile viewport, isMobile and hasTouch, reusing the existing Chromium launch options). Adding it is a harness-configuration decision pending a governance ruling on the M0.5 Constitutional Limit (I.13, unknown Q1/U-01). No Tier C claim on mobile web is supported until then.`,
        browser: browserName,
        platform: "web-mobile",
      });
      return;
    }

    if (!participants || !room) {
      recordM1Row("CERT-SYNC-C-02", {
        status: "unmeasured",
        detail: "A Tier C room could not be provisioned in this environment.",
        browser: browserName,
        platform: "web-mobile",
      });
      test.skip();
      return;
    }
    await measureTierCHandoff({
      rowId: "CERT-SYNC-C-02",
      platform: "web-mobile",
      browser,
      browserName,
      participant: participants[0]!,
      room,
    });
  });
});
