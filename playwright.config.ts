/**
 * Certification harness configuration — M0 Remediation WP2.
 *
 * This config exists to make the Constitution executable. It is CI-ready:
 * deterministic run IDs, a repeatable dev-server startup, and every artifact
 * written under tests/certification/evidence/<runId>/.
 *
 * Rules enforced here:
 *  - No test may assert a PASS it did not measure.
 *  - A profile that is `unsupported` blocks the rows that require it; those
 *    specs are declared `fixme` with a reason, never silently skipped.
 */
import { defineConfig, devices } from "@playwright/test";
import { RUN_ID, EVIDENCE_ROOT } from "./tests/certification/helpers/run-context";

const BASE_URL = process.env["CERT_BASE_URL"] ?? "http://localhost:8080";
const REUSE_SERVER = !process.env["CI"];

export default defineConfig({
  testDir: "./tests/certification",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  outputDir: `${EVIDENCE_ROOT}/${RUN_ID}/artifacts`,
  reporter: [
    ["list"],
    ["json", { outputFile: `${EVIDENCE_ROOT}/${RUN_ID}/report.json` }],
    ["html", { outputFolder: `${EVIDENCE_ROOT}/${RUN_ID}/html`, open: "never" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    { name: "web-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "web-firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "web-webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "bun run dev",
    url: BASE_URL,
    reuseExistingServer: REUSE_SERVER,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
