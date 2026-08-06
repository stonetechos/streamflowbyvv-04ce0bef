/**
 * Certification result-state vocabulary — M0.6 (GATE-01 / GATE-02 / GATE-03).
 *
 * One authoritative definition of the legal result states and of the run
 * sealing state machine. No other module may invent a state.
 *
 *   pass           executed and satisfied its assertion
 *   fail           executed and did not satisfy its assertion
 *   blocked        could not execute — environment, capability, credential,
 *                  browser, profile or dependency unavailable (NOT a product failure)
 *   unmeasured     applicable, but no measurement was attempted or recorded
 *   unknown        state cannot be established from valid evidence
 *   not_applicable the row does not apply to this profile or environment
 */
export const RESULT_STATES = Object.freeze([
  "pass",
  "fail",
  "blocked",
  "unmeasured",
  "unknown",
  "not_applicable",
]);

/** States that may never roll up as a pass. */
export const NON_PASS_STATES = Object.freeze(
  new Set(["fail", "blocked", "unmeasured", "unknown", "not_applicable"]),
);

/**
 * Run sealing state machine.
 *
 *   RUNNING -> PASSED | FAILED | BLOCKED | UNMEASURED | CANCELLED
 *
 * Only PASSED is a successful, sealable run.
 */
export const RUN_STATES = Object.freeze([
  "RUNNING",
  "PASSED",
  "FAILED",
  "BLOCKED",
  "UNMEASURED",
  "CANCELLED",
]);

export const TERMINAL_RUN_STATES = Object.freeze(
  new Set(["PASSED", "FAILED", "BLOCKED", "UNMEASURED", "CANCELLED"]),
);

export function isLegalTransition(from, to) {
  return from === "RUNNING" && TERMINAL_RUN_STATES.has(to);
}

export function isSuccessfulRunState(state) {
  return state === "PASSED";
}

/**
 * GATE-03 — environment-caused failures are `blocked`, never `fail`.
 *
 * Recognises the signatures a missing browser, missing display, missing
 * credential or missing dependency produces. A product assertion failure never
 * matches, so a real failure can never be downgraded.
 */
const ENVIRONMENT_SIGNATURES = [
  /browserType\.launch/i,
  /Executable doesn't exist/i,
  /Please run the following command to download new browsers/i,
  /playwright install/i,
  /Host system is missing dependencies/i,
  /error while loading shared libraries/i,
  /No usable sandbox/i,
  /Missing X server or \$DISPLAY/i,
  /ENOENT: no such file or directory, open '.*chrome.*'/i,
  /Target page, context or browser has been closed \(browser process exited\)/i,
  /Cannot find module 'playwright/i,
  /npm error code ENOTFOUND|getaddrinfo ENOTFOUND/i,
  /Missing required (credential|secret|environment variable)/i,
  /Evidence sealing refused[\s\S]*?run state BLOCKED/i,
];

/**
 * Classify a non-zero stage exit into a result state.
 * @param {string} output combined stdout+stderr of the stage
 * @returns {{ state: "fail" | "blocked", reason: string }}
 */
export function classifyStageFailure(output) {
  const text = String(output ?? "");
  for (const signature of ENVIRONMENT_SIGNATURES) {
    const match = text.match(signature);
    if (match) {
      return {
        state: "blocked",
        reason: `Environment unavailable: matched ${signature} (${match[0].slice(0, 120)})`,
      };
    }
  }
  return { state: "fail", reason: "Stage executed and failed." };
}
