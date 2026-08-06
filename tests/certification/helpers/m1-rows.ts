/**
 * M1 certification row registry — WP1 (T5, evidence writers).
 *
 * WP1 adds no certification row, profile, or evidence semantic. This module
 * only restates, in executable form, the fourteen M1 rows that already exist
 * in `docs/blueprint/K-launch-certification.md`, so a spec cannot invent an
 * evidence id, attach the wrong profile, or record a pass for a row whose
 * profile is unsupported.
 *
 * Traceability: WP1 in `docs/m1/M1-Backlog.md`; row set in
 * `docs/m1/M1.1-Certification-Harness-Discovery.md` §2.
 */
import { isProfileBlocking, profile } from "../profiles/certification-profiles";
import { writeEvidence, type EvidenceStatus, type MetricSample } from "./evidence";

export interface M1Row {
  /** Evidence id exactly as written in K-launch-certification.md. */
  readonly id: string;
  /** Required Result column, verbatim in substance. */
  readonly definition: string;
  /** Owner column — the owning engine. */
  readonly engine: string;
  /** Source column: capability id, or "n/a" as the matrix records it. */
  readonly capability: string;
  /** Platform column. */
  readonly platform: string;
  /** Profiles the row is measured under, from M1.1 §2. */
  readonly profiles: readonly string[];
}

export const M1_ROWS: readonly M1Row[] = [
  {
    id: "CERT-ROOM-01",
    definition: "Invite link lands the user in the intended room, including across sign-in.",
    engine: "Room",
    capability: "n/a",
    platform: "web-desktop",
    profiles: ["PROF-01", "PROF-05"],
  },
  {
    id: "CERT-ROOM-02",
    definition: "Member appears to all peers with correct identity and role.",
    engine: "Room",
    capability: "n/a",
    platform: "web-desktop",
    profiles: ["PROF-01", "PROF-07"],
  },
  {
    id: "CERT-ROOM-03",
    definition: "A joiner beyond capacity is refused with a clear message.",
    engine: "Room",
    capability: "n/a",
    platform: "web-desktop",
    profiles: ["PROF-01", "PROF-07"],
  },
  {
    id: "CERT-ROOM-04",
    definition: "Rejoin within grace restores room context.",
    engine: "Room",
    capability: "n/a",
    platform: "web-desktop",
    profiles: ["PROF-01", "PROF-04"],
  },
  {
    id: "CERT-PRES-01",
    definition: "Readiness state is identical for all participants.",
    engine: "Presence",
    capability: "n/a",
    platform: "web-desktop",
    profiles: ["PROF-01", "PROF-07"],
  },
  {
    id: "CERT-PRES-02",
    definition: "Dropped member is marked absent within threshold.",
    engine: "Presence",
    capability: "n/a",
    platform: "web-desktop",
    profiles: ["PROF-04"],
  },
  {
    id: "CERT-WP-01",
    definition: "All participants reach countdown zero within spread.",
    engine: "Watch Party",
    capability: "n/a",
    platform: "web-desktop",
    profiles: ["PROF-01", "PROF-07"],
  },
  {
    id: "CERT-WP-02",
    definition: "Stages advance identically for host and members.",
    engine: "Watch Party",
    capability: "n/a",
    platform: "web-desktop",
    profiles: ["PROF-01", "PROF-07"],
  },
  {
    id: "CERT-SYNC-C-01",
    definition: "Deep link opens, countdown coordinates, no false sync UI.",
    engine: "Sync",
    capability: "CAP-OTT-WEBDESK",
    platform: "web-desktop",
    profiles: ["PROF-01"],
  },
  {
    id: "CERT-SYNC-C-02",
    definition: "As CERT-SYNC-C-01, on web-mobile.",
    engine: "Sync",
    capability: "CAP-OTT-WEBMOB",
    platform: "web-mobile",
    profiles: ["PROF-01"],
  },
  {
    id: "CERT-PROV-01",
    definition: "Capability tier and consequence stated before commit.",
    engine: "Provider",
    capability: "all B rows",
    platform: "all",
    profiles: ["PROF-01"],
  },
  {
    id: "CERT-PROV-02",
    definition: "One-step fallback, announced, reversible.",
    engine: "Provider",
    capability: "all B rows",
    platform: "web-desktop",
    profiles: ["PROF-01"],
  },
  {
    id: "CERT-EXP-01",
    definition: "WCAG 2.1 AA on all launch surfaces.",
    engine: "Experience",
    capability: "n/a",
    platform: "web-desktop",
    profiles: ["PROF-09"],
  },
  {
    id: "CERT-EXP-02",
    definition: "Motion respects the OS preference everywhere.",
    engine: "Experience",
    capability: "n/a",
    platform: "all",
    profiles: ["PROF-09"],
  },
];

export function m1Row(id: string): M1Row {
  const found = M1_ROWS.find((row) => row.id === id);
  if (!found) throw new Error(`Unknown M1 certification row: ${id}`);
  return found;
}

export interface M1Measurement {
  readonly status: EvidenceStatus;
  readonly detail: string;
  readonly profileId?: string;
  readonly browser?: string;
  readonly platform?: string;
  readonly metric?: MetricSample;
}

/**
 * Writes one M1 evidence record on the existing M0.6 contract.
 *
 * Two invariants, both inherited rather than invented:
 *  - the profile must be one the row is defined against;
 *  - a row measured under an unsupported profile is downgraded to `blocked`,
 *    never recorded as a pass.
 */
export function recordM1Row(id: string, measurement: M1Measurement): void {
  const row = m1Row(id);
  const profileId = measurement.profileId ?? row.profiles[0]!;
  if (!row.profiles.includes(profileId)) {
    throw new Error(`${id} is not defined against ${profileId} (allowed: ${row.profiles.join(", ")})`);
  }
  const blocking = isProfileBlocking(profileId);
  const status: EvidenceStatus = blocking ? "blocked" : measurement.status;
  const detail = blocking
    ? `Blocked by ${profileId} (${profile(profileId).type}): ${profile(profileId).limitations}`
    : measurement.detail;

  writeEvidence({
    evidenceId: row.id,
    profileId,
    browser: measurement.browser ?? "node",
    platform: measurement.platform ?? "node",
    status,
    ...(measurement.metric ? { metric: measurement.metric } : {}),
    detail,
  });
}
