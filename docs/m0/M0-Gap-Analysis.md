# M0 — Gap Analysis

Audit date: 2026-08-06
Authority: StreamFlow v2.0 Architecture Constitution v2.0.0
Scope: identification only. No gap in this document is closed by this sprint.

Categories: **Critical** (blocks Build Mode) · **High** (blocks a launch gate) · **Medium** (blocks a milestone) · **Low** (quality).

## Summary

| Category  | Count  |
| --------- | ------ |
| Critical  | 3      |
| High      | 5      |
| Medium    | 6      |
| Low       | 4      |
| **Total** | **18** |

---

## Critical

### GAP-001 — Tier A is claimed with no adapter and no certification record

**Constitution requirement** [B.4](../blueprint/B-capability-matrix.md): a provider name never qualifies for a tier; Tier A requires a capability tuple `source · adapter · platform · version` and a passing record in [K.4](../blueprint/K-launch-certification.md).

**Why it exists** `provider-tier.ts` was authored during Watch Party Engine v2.0, before the capability-tuple rule was frozen in v2.0.0. It classifies by provider key because at the time no capability registry existed.

**Current state** `src/domain/providers/provider-tier.ts` returns Tier `"a"` for `youtube`, `local_file`, `local`, `google_drive`. A full-tree search finds **zero** embedded player surfaces — no `<video>`, no `iframe`, no player SDK. `embed-player-adapter`, `local-file-adapter`, and `drive-file-adapter` named in [B](../blueprint/B-capability-matrix.md) do not exist. `provider-control.ts` declares a control contract that nothing implements.

**Impact** The system asserts controllable playback it cannot perform. This violates the [C5](../blueprint/C5-product-principles.md) principle "never fake synchronization" and makes four capability rows and four CERT-SYNC-A rows structurally unevidenceable. It is also the single largest contributor to the 51% conformance score.

**Suggested milestone** Demotion in **M0** (the only code change this sprint recommends). Adapter implementation in **M1**.

**Suggested engine** Provider (classification), Sync (adapter).

**Dependencies** GAP-002 (capability registry) must land before Tier A can be re-asserted. DEBT-002.

### GAP-002 — No capability registry; `CAP-*` identifiers exist in no source file

**Constitution requirement** [B.2](../blueprint/B-capability-matrix.md) defines 11 capability rows keyed `CAP-<source>-<platform>` with adapter and version columns.

**Why it exists** The registry was specified in the Constitution but never existed in code; the shelf's 17 provider brands predate it.

**Impact** Tier resolution cannot discriminate by platform. The same provider key resolves identically on web-desktop, web-mobile, Android, and iOS, which the Constitution explicitly forbids ("a provider may be Tier A on one platform and Tier B or C on another"). No capability row can be cross-referenced to a certification row.

**Suggested milestone** M1. **Suggested engine** Provider. **Dependencies** None; this is the enabler for GAP-001, GAP-003, GAP-011.

### GAP-003 — No certification harness exists at all

**Constitution requirement** [K.4](../blueprint/K-launch-certification.md) defines 34 certification rows, of which 14 declare "Full" automation and 12 declare "Partial". [K.7](../blueprint/K-launch-certification.md) makes passing certification the release gate.

**Why it exists** Prior sprints certified by ad-hoc Playwright runs executed in the agent sandbox. Nothing was committed. The repository contains **no** `*.test.*`, **no** `*.spec.*`, and no test runner in `package.json`. `bun run verify` runs format, lint, and `arch:check` only.

**Impact** The release gate is unenforceable. Every "PASS" recorded in earlier sprint reports is unreproducible. No regression can be detected. This blocks milestone-based development outright, because a milestone's Definition of Done is a certification result.

**Suggested milestone** M0 extension or Sprint 86. **Suggested engine** All; harness ownership is Platform. **Dependencies** GAP-004 (profiles) for meaningful runs.

---

## High

### GAP-004 — Certification profiles are prose, not harness configuration

[K.5](../blueprint/K-launch-certification.md) defines nine profiles (Normal, High Latency, Packet Loss, Temporary Disconnect, Background/Foreground, Late Join, Leave/Rejoin, Host Disconnect, Member Disconnect). None is expressed as a runnable configuration. A measurement without a named profile is, per [C4.1](../blueprint/C4-performance-budget.md) rule 5, meaningless — so no number produced today can ever become a Certified Threshold.
**Impact** Blocks every C4 baseline. **Milestone** Sprint 86. **Engine** Platform. **Depends on** GAP-003. DEBT-004.

### GAP-005 — Po compliance refusal is unevidenced

CERT-PO-01 requires 100% refusal of prohibited actions. `compliance-service.ts` and the Po tool registry implement refusal, but no prompt suite exercises it. An unevidenced compliance guarantee on a DRM-adjacent product is a legal-surface exposure, not merely a test gap.
**Impact** Blocking certification row with no path to pass. **Milestone** M1. **Engine** AI/Po. **Depends on** GAP-003. DEBT-016.

### GAP-006 — Analytics has no schema, no validation, no PII guard

CERT-ANL-01 requires "emitted events match the schema, no PII" with zero violations. The engine is two files: a sink abstraction and a subscriber. There is no schema registry and nothing validates at emission.
**Impact** Cannot pass; carries live PII risk today. **Milestone** M1 (register says M3 — recommend acceleration). **Engine** Analytics. **Depends on** Timeline event catalog. DEBT-012.

### GAP-007 — No Measured Baseline exists for any of the 28 C4 metrics

Every cell in [C4](../blueprint/C4-performance-budget.md) reads `TBD (M0)`. Per C4.1 rule 2, no Certified Threshold may be set without a baseline; per rule 3, every metric with `—` is non-gating. Therefore **no certification row is currently gating on performance**.
**Impact** The performance budget is inert. **Milestone** Sprint 86. **Engine** All. **Depends on** GAP-003, GAP-004. DEBT-003.

### GAP-008 — The Constitution defines no Auth engine, yet 41 files implement authentication

Authentication, authorization, session, and the eight auth routes have no engine owner in [C-engine-pack.md](../blueprint/C-engine-pack.md). [M0-Module-Mapping.md](./M0-Module-Mapping.md) files them under Shared Platform as the least-wrong bucket.
**Impact** No engine owns auth certification; no CERT-AUTH row exists despite auth having been the source of the most production blockers in project history. This is a gap in the **frozen document**, and the Constitution may only change by numbered ADR.
**Milestone** ADR before M1. **Engine** proposed: Identity, or an explicit assignment to Room + Community. **Depends on** governance action, not code.

---

## Medium

### GAP-009 — Stage progression authority sits in the presentation layer

`src/features/waiting-room/waiting-room-state.ts` owns the five-stage reveal. [C2](../blueprint/C2-experience-engine.md) permits Experience to own reveal _motion_ but not stage _authority_, which belongs to Watch Party.
**Impact** Stage correctness is not certifiable as a domain invariant (CERT-WP-02). **Milestone** M2. **Engine** Watch Party. **Depends on** none.

### GAP-010 — Realtime channel lifecycle is convention, not contract

`realtime-channel-registry` prevents subscription races by discipline. Nothing enforces it; a new subscriber can bypass it.
**Impact** Race regressions can silently reappear (this class of bug has already shipped once). **Milestone** M2. **Engine** Presence. DEBT-011.

### GAP-011 — Tier B is dead code

`hasMediaSessionObservation` is never set true by any runtime in the tree, so the six Tier B candidate providers always resolve to Tier C. Safe, but CERT-SYNC-B-01/02 can never run.
**Impact** Two certification rows are permanently unevidenceable until an Android shell exists. **Milestone** M4. **Engine** Provider. **Depends on** native shell (DEBT-013).

### GAP-012 — Drift tolerance is a code constant, not a certified threshold

`playback-drift-policy.ts` embeds tolerance values. [C4.3](../blueprint/C4-performance-budget.md) requires drift thresholds to be certified and ratcheted by ADR only.
**Impact** Tuning is invisible to certification. **Milestone** M2. **Engine** Sync. DEBT-008.

### GAP-013 — No moderation capability at the stated launch envelope

Room safety rests entirely on Community block enforcement. Constitution declares Moderation contract-only, so this is _document-conformant_ — but the launch envelope is 2–8 real people in voice.
**Impact** Product risk, not conformance risk. **Milestone** M3. **Engine** Moderation. DEBT-007.

### GAP-014 — Offline intent queue is partial

Not all writes are expressible as intents; poor-network writes can be lost without user-visible failure.
**Impact** Silent data loss under the Packet Loss and Temporary Disconnect profiles. **Milestone** M2. **Engine** Room, Timeline. DEBT-009.

---

## Low

### GAP-015 — ADRs 001–014 lack the mandatory header

[I.3](../blueprint/I-governance.md) requires Dependencies, Superseded ADRs, Affected Engines, Affected Milestones on every ADR. All 14 predate the rule.
**Milestone** M0 documentation task. **Engine** Governance. DEBT-005.

### GAP-016 — Foundation Spec v1.0 is cited everywhere and absent from the repository

Confirmed: no such file under `docs/`. Cited authority cannot be verified.
**Milestone** M0. **Engine** Governance. DEBT-001.

### GAP-017 — Continuous accessibility verification absent

No axe automation; WCAG 2.1 AA is verified per surface, by hand, at intervals. CERT-EXP-01 and CERT-EXP-02 are unevidenced.
**Milestone** M1. **Engine** Experience. DEBT-010.

### GAP-018 — Debug endpoint is unguarded in deployed builds

`src/routes/api/debug/config.ts` has no owning engine and no flag gate.
**Milestone** M1. **Engine** Platform.

---

## Dependency ordering

```text
GAP-002 (capability registry)
   └─> GAP-001 (Tier A demotion, then adapters)
          └─> CERT-SYNC-A rows become evidenceable

GAP-003 (harness)
   ├─> GAP-004 (profiles)
   │      └─> GAP-007 (C4 baselines)
   │             └─> Certified Thresholds become settable
   ├─> GAP-005 (Po refusal suite)
   └─> GAP-017 (a11y automation)

GAP-008 (auth ownership ADR)  — independent, governance only
```

Nothing else can be certified until GAP-003 and GAP-004 exist. That is the sequencing constraint that shapes the Sprint 86 recommendation.
