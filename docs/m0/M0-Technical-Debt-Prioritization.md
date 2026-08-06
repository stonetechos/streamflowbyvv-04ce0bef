# M0 — Technical Debt Prioritization

Audit date: 2026-08-06
Authority: [J-technical-debt.md](../blueprint/J-technical-debt.md) (register), this document (prioritization against observed code)

The register in J assigns milestones at design time. This document re-prioritizes those 17 items against what M0 actually found in the tree, and adds items discovered during the audit (DEBT-018 onward).

Priority definitions:

| Priority | Meaning |
|---|---|
| **Critical** | Blocks authorization of Build Mode |
| **High** | Blocks a launch gate or carries live compliance/legal exposure |
| **Medium** | Blocks a specific milestone's Definition of Done |
| **Low** | Quality, hygiene, or long-horizon |

## Priority summary

| Priority | Items | Register milestone | Recommended milestone |
|---|---|---|---|
| Critical | 4 | mixed | M0 / Sprint 86 |
| High | 5 | mixed | Sprint 86 / M1 |
| Medium | 7 | M1–M4 | unchanged or accelerated |
| Low | 5 | M4+ | unchanged |
| **Total** | **21** | | |

---

## Critical — blocks Build Mode authorization

### DEBT-002 — Tier claims are provider-name shorthand *(register: M0)*
**Confirmed in code.** `provider-tier.ts` returns Tier A for four provider keys with no adapter behind any of them, and no platform discrimination. The Constitution prohibits exactly this in [B.4](../blueprint/B-capability-matrix.md).
**Why it survived** The module predates the capability-tuple rule.
**Cost of delay** Every day this ships, the product asserts a capability it cannot perform. It also poisons four certification rows and one disclosure row.
**Recommended milestone** **M0.** Demotion is a correctness fix, not a feature. **Effort** Small — a classification change, no UI or schema impact.

### DEBT-018 — No automated test or certification harness exists *(new, discovered in M0)*
The repository contains **zero** `*.test.*` and `*.spec.*` files and no test runner. `bun run verify` = format + lint + `arch:check`. Fourteen K.4 rows claim "Full (Playwright)" automation with no committed harness.
**Why it exists** Prior certification was performed by ad-hoc agent-sandbox runs whose scripts were never committed.
**Cost of delay** Milestone-based development is definitionally impossible: a milestone's Definition of Done is a certification result, and no certification can be produced or reproduced.
**Recommended milestone** **Sprint 86, before M1.** **Effort** Large. This is the single largest item in the register.

### DEBT-004 — Certification profiles are not runnable configurations *(register: M0)*
**Confirmed.** The nine K.5 profiles exist only as prose.
**Cost of delay** Per [C4.1](../blueprint/C4-performance-budget.md) rule 5, any number measured without a named profile is meaningless — so even with a harness, no result could become a Certified Threshold.
**Recommended milestone** **Sprint 86**, jointly with DEBT-018. **Effort** Medium.

### DEBT-003 — No Measured Baseline for any C4 metric *(register: M0)*
**Confirmed.** All 28 metrics read `TBD (M0)`; see [M0-Performance-Baseline.md](./M0-Performance-Baseline.md). Consequence: no Certified Threshold is settable, so **no certification row is currently gated on performance**.
**Recommended milestone** **Sprint 86** for the first five metrics; remainder M1. **Depends on** DEBT-018, DEBT-004. **Effort** Medium once the harness exists.

---

## High — blocks a launch gate or carries live exposure

### DEBT-012 — Analytics events are not schema-validated at emission *(register: M3 → recommend M1)*
**Accelerate.** The engine is two files with no schema, no validation, and no PII guard, while CERT-ANL-01 demands zero violations. A PII leak here is a compliance event with no guard standing in front of it. M3 is too late for something that is *currently* unprotected.
**Milestone** **M1.** **Effort** Medium.

### DEBT-016 — Po tool registry lacks automated compliance regression coverage *(register: M7 → recommend M1)*
**Accelerate sharply.** CERT-PO-01 requires 100% refusal of prohibited actions. Refusal is implemented; nothing verifies it. On a DRM-adjacent product this is legal-surface exposure, and M7 leaves it unverified through six milestones of change.
**Milestone** **M1.** **Depends on** DEBT-018. **Effort** Small once a harness exists — it is a prompt suite.

### DEBT-001 — Foundation Spec v1.0 is cited but absent *(register: M0)*
**Confirmed.** No such file under `docs/`. Cited authority cannot be verified and conflicts cannot be adjudicated against it.
**Milestone** **M0** documentation task: either reconstruct it, or issue an ADR formally superseding it with the Constitution and strike the citations. **Effort** Small if superseded, Large if reconstructed. **Recommend superseding** — the Constitution has absorbed its substance.

### DEBT-005 — ADRs 001–014 predate the mandatory header *(register: M0)*
**Confirmed** across all 14 files. Dependencies, superseded links, affected engines, and affected milestones are unrecorded, so the ADR graph required by [I.3](../blueprint/I-governance.md) cannot be walked.
**Milestone** **M0.** **Effort** Small — mechanical backfill. **Note** Backfilling headers does not modify any ADR's decision, so it does not itself require a new ADR.

### DEBT-019 — The Constitution assigns no owner to authentication *(new)*
41 files implement auth and authorization; [C-engine-pack.md](../blueprint/C-engine-pack.md) defines no Auth engine and K.4 contains no CERT-AUTH row — despite auth being the source of the most production blockers in project history.
**Milestone** ADR **before M1**. **Effort** Small (governance). **Note** The Constitution is frozen; this can only be resolved by numbered ADR.

---

## Medium

### DEBT-008 — Drift tolerance embedded in code *(register: M2, unchanged)*
`playback-drift-policy.ts` holds tolerance constants that C4.3 requires to be certified thresholds ratcheted by ADR. Tuning is currently invisible to certification.

### DEBT-011 — Realtime channel lifecycle relies on discipline *(register: M2, unchanged)*
`realtime-channel-registry` prevents races by convention; nothing enforces use. This bug class has already shipped once and was fixed reactively.

### DEBT-009 — Offline intent queue is partial *(register: M2, unchanged)*
Not all writes are expressible as intents; poor-network writes can be lost silently under the Packet Loss and Temporary Disconnect profiles.

### DEBT-007 — Chat and Moderation are contracts only *(register: M3, unchanged)*
Document-conformant, but room safety at a 2–8 person voice launch envelope rests entirely on Community block enforcement.

### DEBT-010 — Accessibility verified per surface, not continuously *(register: M1, unchanged)*
No axe automation; CERT-EXP-01 and CERT-EXP-02 are Unknown. Regressions can ship between manual audits.

### DEBT-020 — Stage progression authority sits in the presentation layer *(new)*
`waiting-room-state.ts` owns the five-stage reveal, crossing the [C2](../blueprint/C2-experience-engine.md) boundary between reveal motion (Experience) and stage authority (Watch Party). Makes CERT-WP-02 uncertifiable as a domain invariant.
**Milestone** M2. **Effort** Medium.

### DEBT-021 — `src/features/waiting-room/` spans five engines *(new)*
43 presentation files mixing Room, Presence, Watch Party, Sync, and Provider concerns. Domain separation is intact, so this is organisational rather than architectural — but it obscures engine ownership and makes certification-row attribution manual.
**Milestone** M2, opportunistically. **Effort** Medium. **Explicitly not an M0 action** — refactoring during a conformance audit destroys the baseline being measured.

---

## Low

### DEBT-013 — Android and iOS adapter surfaces unimplemented *(register: M4, unchanged)*
Keeps several capability rows at `investigating` and makes Tier B permanently unreachable (GAP-011).

### DEBT-015 — Event store has no compaction or archival strategy *(register: M4, unchanged)*
Replay cost grows with room history. Not yet material at current volume.

### DEBT-017 — Feature flags lack an enforced removal check *(register: M5, unchanged)*
Flags become permanent configuration. `foundation/feature-flags/` has a registry that could carry a removal milestone field.

### DEBT-014 — No cross-product extraction path exercised *(register: Post-v2.0, unchanged)*
[G](../blueprint/G-platform-foundation.md) portability readiness is theoretical.

### DEBT-022 — Unguarded debug endpoint *(new)*
`src/routes/api/debug/config.ts` has no owning engine and no flag gate, and is reachable in deployed builds.
**Milestone** M1. **Effort** Trivial.

---

## Recommended sequencing

```text
M0 (this sprint + immediate follow-up)
  DEBT-002  demote name-based Tier A          [code, small]
  DEBT-001  supersede Foundation Spec by ADR  [docs]
  DEBT-005  backfill ADR headers              [docs]

Sprint 86 (prerequisite to M1)
  DEBT-018  commit a certification harness    [large]
  DEBT-004  express the nine K.5 profiles     [medium]
  DEBT-003  first five C4 baselines           [medium]
  DEBT-019  auth ownership ADR                [governance]

M1
  DEBT-012  analytics schema + PII guard   (accelerated from M3)
  DEBT-016  Po refusal prompt suite        (accelerated from M7)
  DEBT-010  continuous a11y automation
  DEBT-022  gate the debug endpoint
  (+ capability registry, Tier A adapters)

M2   DEBT-008, DEBT-009, DEBT-011, DEBT-020, DEBT-021
M3   DEBT-007
M4+  DEBT-013, DEBT-015, DEBT-017, DEBT-014
```

Two acceleration decisions are the substance of this document: **DEBT-012 from M3 to M1** and **DEBT-016 from M7 to M1**. Both guard obligations that are unprotected right now, and both are cheap once a harness exists.
