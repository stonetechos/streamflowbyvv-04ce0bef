/**
 * Voice certification — BLOCKED by PROF-08 (unsupported profile).
 *
 * Per WP3, a row that requires an unsupported profile is blocked, not skipped
 * quietly and never passed. The suite records blocked evidence so the M0
 * recertification can count it honestly.
 */
import { test } from "@playwright/test";
import { profile } from "../profiles/certification-profiles";
import { writeEvidence } from "../helpers/evidence";

const VOICE_PROFILE = profile("PROF-08");

test("VOICE-01 audio-only transport establishes for two participants", async () => {
  writeEvidence({
    evidenceId: "CERT-VOICE-01",
    profileId: VOICE_PROFILE.profileId,
    browser: "n/a",
    platform: "n/a",
    status: "blocked",
    detail: `Blocked by ${VOICE_PROFILE.profileId} (${VOICE_PROFILE.type}): ${VOICE_PROFILE.limitations}`,
  });
  test.fixme(true, `Blocked by ${VOICE_PROFILE.profileId}: ${VOICE_PROFILE.limitations}`);
});

test("VOICE-02 no domain state is carried over the voice transport", async () => {
  writeEvidence({
    evidenceId: "CERT-VOICE-02",
    profileId: VOICE_PROFILE.profileId,
    browser: "n/a",
    platform: "n/a",
    status: "blocked",
    detail:
      "Live-transport assertion blocked by PROF-08. Static equivalent is certified as CERT-SA-01.",
  });
  test.fixme(true, "Blocked by PROF-08; static proof recorded as CERT-SA-01.");
});
