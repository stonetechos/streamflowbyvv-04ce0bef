/**
 * Certification profiles — M0 Remediation WP3.
 *
 * The nine Constitution profiles as executable definitions. A profile whose
 * `type` is `unsupported` BLOCKS every certification row that requires it;
 * the harness refuses to record a pass for such a row.
 */

export const PROFILE_TYPES = ["automated", "manual", "unsupported"] as const;
export type ProfileType = (typeof PROFILE_TYPES)[number];

export interface CertificationProfile {
  readonly profileId: string;
  readonly name: string;
  readonly type: ProfileType;
  readonly simulationMethod: string;
  readonly parameters: Readonly<Record<string, string | number>>;
  readonly expectedBehaviour: string;
  readonly automationStatus: "implemented" | "partial" | "not_implemented";
  readonly supportedPlatforms: readonly string[];
  readonly limitations: string;
}

export const CERTIFICATION_PROFILES: readonly CertificationProfile[] = [
  {
    profileId: "PROF-01",
    name: "Nominal Broadband",
    type: "automated",
    simulationMethod: "No shaping; native local network via Playwright default context.",
    parameters: { latencyMs: 0, jitterMs: 0, lossPct: 0 },
    expectedBehaviour: "All room, realtime and countdown flows complete within measured baseline.",
    automationStatus: "implemented",
    supportedPlatforms: ["web-chromium", "web-firefox", "web-webkit"],
    limitations: "Local dev network is not representative of consumer last-mile.",
  },
  {
    profileId: "PROF-02",
    name: "High Latency",
    type: "automated",
    simulationMethod: "CDP Network.emulateNetworkConditions (Chromium only).",
    parameters: { latencyMs: 400, downloadKbps: 5000, uploadKbps: 2000 },
    expectedBehaviour: "Ready propagation and countdown still converge; spread widens predictably.",
    automationStatus: "partial",
    supportedPlatforms: ["web-chromium"],
    limitations: "Firefox and WebKit expose no shaping API; those rows stay manual.",
  },
  {
    profileId: "PROF-03",
    name: "Packet Loss",
    type: "unsupported",
    simulationMethod: "Requires OS-level netem/pfctl shaping outside the browser sandbox.",
    parameters: { lossPct: 3 },
    expectedBehaviour: "Realtime channel recovers; no duplicated domain events.",
    automationStatus: "not_implemented",
    supportedPlatforms: [],
    limitations: "BLOCKING: no loss injection available in the CI sandbox. Rows requiring PROF-03 cannot be certified.",
  },
  {
    profileId: "PROF-04",
    name: "Network Interruption",
    type: "automated",
    simulationMethod: "context.setOffline(true) then false, with a measured outage window.",
    parameters: { outageMs: 5000 },
    expectedBehaviour: "Client reconnects, resubscribes, and reconciles server-authoritative state.",
    automationStatus: "implemented",
    supportedPlatforms: ["web-chromium", "web-firefox", "web-webkit"],
    limitations: "Simulates client-side loss of connectivity only, not server partition.",
  },
  {
    profileId: "PROF-05",
    name: "Cold Start",
    type: "automated",
    simulationMethod: "Fresh browser context, cleared storage, first navigation timing.",
    parameters: { iterations: 5 },
    expectedBehaviour: "First meaningful room surface within performance budget.",
    automationStatus: "implemented",
    supportedPlatforms: ["web-chromium", "web-firefox", "web-webkit"],
    limitations: "Dev server timings are not production timings; baseline only.",
  },
  {
    profileId: "PROF-06",
    name: "Background / Throttled Tab",
    type: "manual",
    simulationMethod: "Tab backgrounding with timer throttling; requires a real user agent session.",
    parameters: { backgroundMs: 30000 },
    expectedBehaviour: "Countdown reconciles from server clock on foreground, never drifts silently.",
    automationStatus: "not_implemented",
    supportedPlatforms: ["web-chromium", "android-shell"],
    limitations: "Headless Chromium does not throttle background timers faithfully.",
  },
  {
    profileId: "PROF-07",
    name: "Multi-Participant Scale (2-4)",
    type: "automated",
    simulationMethod: "N parallel browser contexts joining the same room.",
    parameters: { participants: 4 },
    expectedBehaviour: "Every member observes the same authoritative state within spread budget.",
    automationStatus: "implemented",
    supportedPlatforms: ["web-chromium"],
    limitations: "Requires provisionable test identities; blocked without them.",
  },
  {
    profileId: "PROF-08",
    name: "Voice Transport",
    type: "unsupported",
    simulationMethod: "Requires LiveKit credentials and fake-media device flags.",
    parameters: { participants: 2 },
    expectedBehaviour: "Audio-only transport establishes; no domain state travels over WebRTC.",
    automationStatus: "not_implemented",
    supportedPlatforms: [],
    limitations: "BLOCKING: no LiveKit test project is provisioned. Voice rows cannot be certified.",
  },
  {
    profileId: "PROF-09",
    name: "Accessibility Sweep",
    type: "automated",
    simulationMethod: "Playwright accessibility snapshot plus keyboard traversal on public routes.",
    parameters: { routes: 3 },
    expectedBehaviour: "No focus traps; every interactive control is reachable and named.",
    automationStatus: "partial",
    supportedPlatforms: ["web-chromium"],
    limitations: "Automated sweeps detect a minority of WCAG 2.1 AA failures; manual audit still required.",
  },
];

export function profile(profileId: string): CertificationProfile {
  const found = CERTIFICATION_PROFILES.find((entry) => entry.profileId === profileId);
  if (!found) throw new Error(`Unknown certification profile: ${profileId}`);
  return found;
}

/** A row requiring an unsupported profile is blocked, never passed. */
export function isProfileBlocking(profileId: string): boolean {
  return profile(profileId).type === "unsupported";
}
