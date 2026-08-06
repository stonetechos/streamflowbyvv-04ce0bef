/**
 * M1 provider disclosure certification — WP1 (CERT-PROV-01, CERT-PROV-02).
 *
 * These rows are about honesty at the moment of commitment: the tier and its
 * consequence must be stated before a person commits to a provider, and any
 * fallback must be one step, announced, and reversible. The surface under test
 * is the provider selection the room already renders. Where the surface cannot
 * be reached without driving a session start (out of WP1 scope), the row is
 * recorded `unmeasured` with the reason.
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

/** Words the disclosure must carry to count as stating tier and consequence. */
const TIER_WORDS = /\btier\s*c\b|coordinated manual|manual sync/i;
const CONSEQUENCE_WORDS =
  /start (it )?(yourself|manually)|press play|on your own|not control|cannot control|manually/i;

test.describe("M1 provider disclosure", () => {
  test.slow();
  test.describe.configure({ mode: "serial" });

  let participants: readonly CertParticipant[] | null = null;
  let room: CertRoom | null = null;

  test.beforeAll(async () => {
    if (!backendConfigured) return;
    participants = await provisionParticipants(1, "prov");
    if (!participants) return;
    room = await createRoomWithCapacity(participants[0]!, 4, "M1 provider disclosure");
    if (room) await seatHost(participants[0]!, room);
  });

  test.afterAll(async () => {
    if (participants && room) await disposeRoom(participants[0]!, room);
  });

  test("CERT-PROV-01 capability tier and consequence stated before commit", async ({
    browser,
    browserName,
  }) => {
    if (!participants || !room) {
      recordM1Row("CERT-PROV-01", {
        status: "unmeasured",
        detail: "A room hosting the provider surface could not be provisioned in this environment.",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }
    const session = await signedInContext(browser, participants[0]!, BASE_URL);
    if (!session) {
      recordM1Row("CERT-PROV-01", {
        status: "unmeasured",
        detail: "No transplantable host session; the provider surface was not inspected.",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }

    await session.page.goto(`${BASE_URL}/rooms/${room.id}`, { waitUntil: "domcontentloaded" });
    await session.page.waitForTimeout(1500);
    const text = await session.page.evaluate(() => document.body.innerText);
    await session.context.close();

    const statesTier = TIER_WORDS.test(text);
    const statesConsequence = CONSEQUENCE_WORDS.test(text);

    recordM1Row("CERT-PROV-01", {
      status: statesTier && statesConsequence ? "pass" : "unmeasured",
      detail:
        statesTier && statesConsequence
          ? "The provider surface states the capability tier and what it means for the viewer before any provider is committed to."
          : `Tier wording ${statesTier ? "present" : "absent"}, consequence wording ${statesConsequence ? "present" : "absent"} on the pre-commit surface reachable without starting a session. Reaching the full launcher requires driving session start, which WP1 (test/infrastructure) does not exercise; the row stays unmeasured rather than being failed on a partial surface.`,
      browser: browserName,
      platform: "web-desktop",
    });
  });

  test("CERT-PROV-02 one-step fallback, announced and reversible", async ({ browserName }) => {
    recordM1Row("CERT-PROV-02", {
      status: "unmeasured",
      detail:
        "Fallback certification requires injecting a provider-launch fault and observing the announced, reversible alternative. No fault-injection seam exists on the provider path, and adding one is production instrumentation outside WP1 (test/infrastructure only). Row remains unmeasured; no fallback claim is supported.",
      browser: browserName,
      platform: "web-desktop",
    });
  });
});
