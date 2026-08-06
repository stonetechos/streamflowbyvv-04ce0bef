import { test } from "@playwright/test";
import { createRoomWithCapacity, provisionParticipants, seatHost, signedInContext } from "../fixtures/identities";

const BASE_URL = process.env["CERT_BASE_URL"] ?? "http://localhost:8080";

test("debug lobby", async ({ browser }) => {
  test.slow();
  const ps = await provisionParticipants(1, "dbg");
  if (!ps) return;
  const room = await createRoomWithCapacity(ps[0]!, 4, "dbg");
  if (!room) return;
  await seatHost(ps[0]!, room);
  const s = await signedInContext(browser, ps[0]!, BASE_URL);
  if (!s) return;
  await s.page.goto(`${BASE_URL}/rooms/${room.id}`, { waitUntil: "domcontentloaded" });
  await s.page.waitForTimeout(6000);
  const text = await s.page.locator("body").innerText();
  console.log("TEXT>>>", text.slice(0, 3000));
  console.log("RADIOS>>>", await s.page.locator('[role="radio"]').count());
  console.log("BUSY>>>", await s.page.locator('[aria-busy="true"]').count());
  await s.context.close();
});
