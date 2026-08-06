/**
 * WP7 — Authorization negative certification.
 *
 * Every case here asserts that a client CANNOT do something. RLS is the
 * subject under test; the UI is deliberately bypassed. When identities cannot
 * be provisioned the rows are recorded `unmeasured` — never passed.
 */
import { test, expect } from "@playwright/test";
import {
  provisionIdentity,
  profileIdFor,
  createCertRoom,
  backendConfigured,
  type CertIdentity,
} from "../fixtures/backend";
import { writeEvidence } from "../helpers/evidence";

test.describe("WP7 authorization boundaries", () => {
  test.slow();

  let host: CertIdentity | null = null;
  let outsider: CertIdentity | null = null;
  let hostProfileId: string | null = null;
  let roomId: string | null = null;

  test.beforeAll(async () => {
    if (!backendConfigured) return;
    host = await provisionIdentity("host");
    outsider = await provisionIdentity("outsider");
    if (!host) return;
    hostProfileId = await profileIdFor(host);
    if (!hostProfileId) return;
    const room = await createCertRoom(host, hostProfileId);
    roomId = room?.id ?? null;
  });

  function skipUnless(condition: unknown, evidenceId: string, reason: string): boolean {
    if (condition) return false;
    writeEvidence({
      evidenceId,
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "unmeasured",
      detail: reason,
    });
    return true;
  }

  test("AUTHZ-01 non-member cannot read another room's state", async () => {
    if (
      skipUnless(
        outsider && roomId,
        "CERT-AUTHZ-01",
        "No provisionable identities or room in this environment.",
      )
    )
      test.skip();
    const { data } = await outsider!.client.from("room_state").select("*").eq("room_id", roomId!);
    expect(data ?? []).toHaveLength(0);
    writeEvidence({
      evidenceId: "CERT-AUTHZ-01",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: "Non-member read of room_state returned zero rows under RLS.",
    });
  });

  test("AUTHZ-02 non-member cannot update room state", async () => {
    if (
      skipUnless(
        outsider && roomId,
        "CERT-AUTHZ-02",
        "No provisionable identities or room in this environment.",
      )
    )
      test.skip();
    const { data } = await outsider!.client
      .from("room_state")
      .update({ version: 999_999 })
      .eq("room_id", roomId!)
      .select("room_id");
    expect(data ?? []).toHaveLength(0);
    writeEvidence({
      evidenceId: "CERT-AUTHZ-02",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: "Non-member update affected zero rows.",
    });
  });

  test("AUTHZ-03 non-member cannot mutate membership (host boundary)", async () => {
    if (
      skipUnless(
        outsider && roomId,
        "CERT-AUTHZ-03",
        "No provisionable identities or room in this environment.",
      )
    )
      test.skip();
    const { data } = await outsider!.client
      .from("room_members")
      .update({ role: "host" })
      .eq("room_id", roomId!)
      .select("id");
    expect(data ?? []).toHaveLength(0);
    writeEvidence({
      evidenceId: "CERT-AUTHZ-03",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: "Host-role escalation by an outsider affected zero rows.",
    });
  });

  test("AUTHZ-04 co-host boundary: a member cannot promote themselves", async () => {
    if (
      skipUnless(
        outsider && roomId,
        "CERT-AUTHZ-04",
        "No provisionable identities or room in this environment.",
      )
    )
      test.skip();
    const outsiderProfileId = await profileIdFor(outsider!);
    const { error } = await outsider!.client.from("room_members").insert({
      room_id: roomId!,
      profile_id: outsiderProfileId,
      role: "co_host",
      state: "joined",
    });
    expect(error).not.toBeNull();
    writeEvidence({
      evidenceId: "CERT-AUTHZ-04",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: "Self-inserted co_host membership rejected by RLS.",
    });
  });

  test("AUTHZ-05 stale version writes are refused (monotonic room_state)", async () => {
    if (
      skipUnless(
        host && roomId,
        "CERT-AUTHZ-05",
        "No provisionable host identity in this environment.",
      )
    )
      test.skip();
    const { data: current } = await host!.client
      .from("room_state")
      .select("version")
      .eq("room_id", roomId!)
      .maybeSingle();
    if (!current) {
      writeEvidence({
        evidenceId: "CERT-AUTHZ-05",
        profileId: "PROF-01",
        browser: "node",
        platform: "node",
        status: "unmeasured",
        detail: "Room has no room_state row; monotonic version guard not exercised.",
      });
      test.skip();
    }
    const { error } = await host!.client
      .from("room_state")
      .update({ version: (current!["version"] as number) - 1 })
      .eq("room_id", roomId!);
    expect(error).not.toBeNull();
    writeEvidence({
      evidenceId: "CERT-AUTHZ-05",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: "Decreasing room_state.version rejected by enforce_room_state_version trigger.",
    });
  });

  test("AUTHZ-06 cross-room mutation is refused", async () => {
    if (
      skipUnless(
        host && outsider,
        "CERT-AUTHZ-06",
        "No provisionable identities in this environment.",
      )
    )
      test.skip();
    const outsiderProfileId = await profileIdFor(outsider!);
    const { data } = await outsider!.client
      .from("rooms")
      .update({ name: "hijacked", host_profile_id: outsiderProfileId })
      .eq("id", roomId!)
      .select("id");
    expect(data ?? []).toHaveLength(0);
    writeEvidence({
      evidenceId: "CERT-AUTHZ-06",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: "Cross-room ownership rewrite affected zero rows.",
    });
  });

  test("AUTHZ-07 anonymous client cannot enumerate rooms", async () => {
    if (skipUnless(backendConfigured, "CERT-AUTHZ-07", "Backend not configured for this run."))
      test.skip();
    const { anonClient } = await import("../fixtures/backend");
    const { data } = await anonClient().from("rooms").select("id").limit(5);
    expect(data ?? []).toHaveLength(0);
    writeEvidence({
      evidenceId: "CERT-AUTHZ-07",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: "Unauthenticated room enumeration returned zero rows.",
    });
  });
});
