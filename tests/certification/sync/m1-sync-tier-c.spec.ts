/**
 * M1 Tier C sync certification — WP1 (spec homes for CERT-SYNC-C-01/02).
 *
 * Tier C is coordinated manual sync. The row's decisive clause is "no false
 * sync UI": ADR-014 forbids any affordance that implies the app can drive
 * playback in a provider. That claim is measurable from the DOM today, and is
 * measured here. The web-mobile row has no Playwright project to run under
 * (unknown U-01), so it is recorded `unmeasured` naming the missing project.
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
import { recordM1Row } from "../helpers/m1-rows";

const BASE_URL = process.env["CERT_BASE_URL"] ?? "http://localhost:8080";

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
    const session = await signedInContext(browser, participants[0]!, BASE_URL);
    if (!session) {
      recordM1Row("CERT-SYNC-C-01", {
        status: "unmeasured",
        detail: "No transplantable host session; the room surface was not inspected.",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }

    await session.page.goto(`${BASE_URL}/rooms/${room.id}`, { waitUntil: "domcontentloaded" });
    await session.page.waitForTimeout(1500);
    const offenders: string[] = [];
    for (const selector of FALSE_SYNC_AFFORDANCES) {
      const count = await session.page.locator(selector).count();
      if (count > 0) offenders.push(`${selector} ×${count}`);
    }
    const url = session.page.url();
    await session.context.close();

    const reachedRoom = new RegExp(`/rooms/${room.id}`).test(url);
    const clean = reachedRoom && offenders.length === 0;

    recordM1Row("CERT-SYNC-C-01", {
      status: clean ? "pass" : "fail",
      detail: reachedRoom
        ? offenders.length === 0
          ? "The room surface opened and exposed no transport, scrubber, or play/pause affordance — consistent with ADR-014 Tier C. Countdown coordination itself is measured by CERT-WP-01."
          : `The room surface exposes playback affordances that imply provider control (ADR-014): ${offenders.join(", ")}.`
        : `The room deep link did not open the room; landed at ${url}.`,
      browser: browserName,
      platform: "web-desktop",
    });
  });

  test("CERT-SYNC-C-02 same guarantee on web-mobile", async ({ browserName }) => {
    recordM1Row("CERT-SYNC-C-02", {
      status: "unmeasured",
      detail:
        "No `web-mobile` Playwright project exists in playwright.config.ts, so this row has no environment to run in. Adding one is a harness-configuration decision outside WP1's task list (unknown U-01 in M1.1 §7); until it exists the row remains unmeasured and cannot support any Tier C claim on mobile web.",
      browser: browserName,
      platform: "web-mobile",
    });
  });
});
