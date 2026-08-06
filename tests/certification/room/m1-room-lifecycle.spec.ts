/**
 * M1 room lifecycle certification — WP1 (T2, spec homes for CERT-ROOM-01..04).
 *
 * These specs exercise the shipped product path: the invite route, the join
 * flow behind it, and RLS as the platform actually enforces it. They add no
 * product behaviour and change no certification semantic. Where the platform
 * does not do what the row requires, the row is recorded `fail` with the
 * observed behaviour; where the environment cannot produce the measurement,
 * it is recorded `unmeasured`. Neither is ever recorded as a pass.
 *
 * Rows: docs/blueprint/K-launch-certification.md.
 * Gaps this spec closes: docs/m1/M1.1-Certification-Harness-Discovery.md §2.
 */
import { expect, test, type Browser } from "@playwright/test";

import { backendConfigured } from "../fixtures/backend";
import {
  createRoomWithCapacity,
  disposeRoom,
  joinAsGuest,
  leaveRoom,
  provisionParticipants,
  readRoster,
  seatHost,
  signedInContext,
  type CertParticipant,
  type CertRoom,
} from "../fixtures/identities";
import { recordM1Row } from "../helpers/m1-rows";

const BASE_URL = process.env["CERT_BASE_URL"] ?? "http://localhost:8080";

test.describe("M1 room lifecycle", () => {
  test.slow();
  test.describe.configure({ mode: "serial" });

  let participants: readonly CertParticipant[] | null = null;
  let room: CertRoom | null = null;

  test.beforeAll(async () => {
    if (!backendConfigured) return;
    participants = await provisionParticipants(3, "room");
    if (!participants) return;
    room = await createRoomWithCapacity(participants[0]!, 2, "M1 room lifecycle");
    if (room) await seatHost(participants[0]!, room);
  });

  test.afterAll(async () => {
    if (participants && room) await disposeRoom(participants[0]!, room);
  });

  function environmentReason(): string {
    return backendConfigured
      ? "Certification identities or a lobby could not be provisioned in this environment; sign-up or RLS refused the fixture."
      : "No backend configuration is present for this run (VITE_SUPABASE_URL / publishable key absent).";
  }

  test("CERT-ROOM-01 invite link lands in the intended room, including across sign-in", async ({
    browser,
    browserName,
  }: {
    browser: Browser;
    browserName: string;
  }) => {
    if (!participants || !room) {
      recordM1Row("CERT-ROOM-01", {
        status: "unmeasured",
        detail: environmentReason(),
        profileId: "PROF-01",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }

    const guest = participants[1]!;
    const inviteUrl = `${BASE_URL}/join/${room.code}`;

    // Leg one, PROF-05: a cold, signed-out visitor must be parked at sign-in
    // with the destination remembered rather than dropped.
    const coldContext = await browser.newContext();
    const coldPage = await coldContext.newPage();
    await coldPage.goto(inviteUrl, { waitUntil: "domcontentloaded" });
    await coldPage.waitForURL(/\/auth/, { timeout: 20_000 }).catch(() => undefined);
    const parkedAtAuth = /\/auth/.test(coldPage.url());
    const remembered = await coldPage.evaluate(() =>
      window.localStorage.getItem("streamflow.pending_invite_code"),
    );
    await coldContext.close();

    recordM1Row("CERT-ROOM-01", {
      status: parkedAtAuth && remembered === room.code ? "pass" : "fail",
      detail: parkedAtAuth
        ? `Signed-out invite open parked at ${"/auth"} with pending code ${String(remembered)} (expected ${room.code}).`
        : `Signed-out invite open did not reach sign-in; landed at ${coldPage.url()}.`,
      profileId: "PROF-05",
      browser: browserName,
      platform: "web-desktop",
    });

    // Leg two, PROF-01: with a session in hand the same link must end in the
    // room, not at home and not at an error.
    const session = await signedInContext(browser, guest, BASE_URL);
    if (!session) {
      recordM1Row("CERT-ROOM-01", {
        status: "unmeasured",
        detail:
          "No transplantable session for the guest identity; the signed-in leg was not measured.",
        profileId: "PROF-01",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }
    await session.page.goto(inviteUrl, { waitUntil: "domcontentloaded" });
    const landed = await session.page
      .waitForURL(new RegExp(`/rooms/${room.id}`), { timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    const finalUrl = session.page.url();
    await session.context.close();

    recordM1Row("CERT-ROOM-01", {
      status: landed ? "pass" : "fail",
      detail: landed
        ? `Signed-in invite open resolved to the intended room ${room.id}.`
        : `Signed-in invite open ended at ${finalUrl} instead of /rooms/${room.id}.`,
      profileId: "PROF-01",
      browser: browserName,
      platform: "web-desktop",
    });
    expect(landed).toBe(true);
  });

  test("CERT-ROOM-02 member appears to all peers with correct identity and role", async ({
    browserName,
  }) => {
    if (!participants || !room) {
      recordM1Row("CERT-ROOM-02", {
        status: "unmeasured",
        detail: environmentReason(),
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }
    const [host, guest] = participants;
    const outcome = await joinAsGuest(guest!, room);
    if (!outcome.accepted) {
      recordM1Row("CERT-ROOM-02", {
        status: "fail",
        detail: `A guest could not seat itself in an open lobby: ${outcome.message}`,
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      return;
    }

    const hostView = await readRoster(host!, room);
    const guestView = await readRoster(guest!, room);
    const agrees = (view: readonly { profileId: string; role: string; state: string }[]) =>
      view.some(
        (m) => m.profileId === host!.profileId && m.role === "host" && m.state === "joined",
      ) &&
      view.some(
        (m) => m.profileId === guest!.profileId && m.role === "guest" && m.state === "joined",
      );
    const symmetric = agrees(hostView) && agrees(guestView) && hostView.length === guestView.length;

    recordM1Row("CERT-ROOM-02", {
      status: symmetric ? "pass" : "fail",
      detail: symmetric
        ? `Both peers read the same two-member roster with identities and roles intact (host=${host!.profileId}, guest=${guest!.profileId}).`
        : `Peer rosters disagree. Host saw ${JSON.stringify(hostView)}; guest saw ${JSON.stringify(guestView)}.`,
      profileId: "PROF-07",
      browser: browserName,
      platform: "web-desktop",
    });
    expect(symmetric).toBe(true);
  });

  test("CERT-ROOM-03 a joiner beyond capacity is refused with a clear message", async ({
    browser,
    browserName,
  }: {
    browser: Browser;
    browserName: string;
  }) => {
    if (!participants || !room) {
      recordM1Row("CERT-ROOM-03", {
        status: "unmeasured",
        detail: environmentReason(),
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }
    // The lobby holds two seats and both are taken by CERT-ROOM-02.
    const overflow = participants[2]!;
    const session = await signedInContext(browser, overflow, BASE_URL);
    if (!session) {
      recordM1Row("CERT-ROOM-03", {
        status: "unmeasured",
        detail:
          "No transplantable session for the overflow identity; refusal could not be observed in the product path.",
        profileId: "PROF-07",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }

    await session.page.goto(`${BASE_URL}/join/${room.code}`, { waitUntil: "domcontentloaded" });
    const enteredRoom = await session.page
      .waitForURL(new RegExp(`/rooms/${room.id}`), { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    const visibleText = enteredRoom
      ? ""
      : await session.page.evaluate(() => document.body.innerText);
    await session.context.close();

    const refusedWithMessage = !enteredRoom && visibleText.trim().length > 0;
    const roster = await readRoster(participants[0]!, room);
    const seated = roster.filter((member) => member.state === "joined").length;

    recordM1Row("CERT-ROOM-03", {
      status: refusedWithMessage && seated <= room.maxMembers ? "pass" : "fail",
      detail: refusedWithMessage
        ? `Overflow joiner was refused in the UI with a message and the lobby held ${seated}/${room.maxMembers} seats. Message shown: ${visibleText.replace(/\s+/g, " ").slice(0, 200)}`
        : `Overflow joiner was admitted (url ${enteredRoom ? "reached the room" : "unknown"}); lobby now holds ${seated}/${room.maxMembers} seats.`,
      profileId: "PROF-07",
      browser: browserName,
      platform: "web-desktop",
    });
  });

  test("CERT-ROOM-04 rejoin within grace restores room context", async ({
    browser,
    browserName,
  }: {
    browser: Browser;
    browserName: string;
  }) => {
    if (!participants || !room) {
      recordM1Row("CERT-ROOM-04", {
        status: "unmeasured",
        detail: environmentReason(),
        profileId: "PROF-04",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }
    const guest = participants[1]!;
    const left = await leaveRoom(guest, room);
    if (!left) {
      recordM1Row("CERT-ROOM-04", {
        status: "unmeasured",
        detail:
          "The guest membership could not be moved to `left`, so no departure preceded the rejoin.",
        profileId: "PROF-04",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }

    const session = await signedInContext(browser, guest, BASE_URL);
    if (!session) {
      recordM1Row("CERT-ROOM-04", {
        status: "unmeasured",
        detail:
          "No transplantable session for the returning guest; the rejoin path was not exercised.",
        profileId: "PROF-04",
        browser: browserName,
        platform: "web-desktop",
      });
      test.skip();
      return;
    }
    await session.page.goto(`${BASE_URL}/join/${room.code}`, { waitUntil: "domcontentloaded" });
    const restored = await session.page
      .waitForURL(new RegExp(`/rooms/${room.id}`), { timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    const finalUrl = session.page.url();
    await session.context.close();

    const roster = await readRoster(participants[0]!, room);
    const rejoined = roster.find((member) => member.profileId === guest.profileId);
    const contextRestored = restored && rejoined?.state === "joined";

    recordM1Row("CERT-ROOM-04", {
      status: contextRestored ? "pass" : "fail",
      detail: contextRestored
        ? `A departed guest returning through the invite link re-entered ${room.id} and the host's roster shows them joined again.`
        : `Rejoin did not restore context. Landed at ${finalUrl}; host roster state for the returning guest is ${String(rejoined?.state)}.`,
      profileId: "PROF-04",
      browser: browserName,
      platform: "web-desktop",
    });
  });
});
