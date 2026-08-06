# J — Technical Debt Register

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

Each entry records: severity, owning engine, impact, and the milestone by which it must be resolved. An entry without an owner and a target milestone is invalid.

## J.1 Immediate — must be resolved in M0

| ID | Debt | Owner | Impact | Target |
|---|---|---|---|---|
| DEBT-001 | Foundation Spec v1.0 is cited across the documentation set but the file is absent from the repository | Governance | Cited authority cannot be verified; conflicts cannot be adjudicated | M0 |
| DEBT-002 | Tier claims exist as provider-name shorthand rather than capability tuples | Provider | Violates [B.4](./B-capability-matrix.md#b4-provider-name-shorthand-is-prohibited); overstates capability | M0 |
| DEBT-003 | No Measured Baseline exists for any [C4](./C4-performance-budget.md) metric | All | No Certified Threshold can be set; certification cannot gate | M0 |
| DEBT-004 | Certification profiles are not implemented as reusable harness configurations | All | Scenarios are hardcoded per test; results are not comparable | M0 |
| DEBT-005 | ADRs 001–014 predate the mandatory header in [I.3](./I-governance.md#i3-mandatory-adr-header) | Governance | Dependencies, superseded links, affected engines/milestones unrecorded | M0 |
| DEBT-006 | Engine-to-module mapping unverified against the shipped tree | All | Orphaned modules and hidden cycles possible | M0 |

## J.2 Near-term — M1 to M3

| ID | Debt | Owner | Impact | Target |
|---|---|---|---|---|
| DEBT-007 | Chat and Moderation exist as contracts only | Chat, Moderation | Room safety depends on Community block enforcement alone | M3 |
| DEBT-008 | Drift tolerance policy is embedded in code rather than expressed as certified thresholds | Sync | Tuning is invisible to certification | M2 |
| DEBT-009 | Offline intent queue is partial; not all writes are expressible as intents | Room, Timeline | Poor-network writes can be lost silently | M2 |
| DEBT-010 | Accessibility conformance verified per surface, not continuously | Experience | Regressions can ship between audits | M1 |
| DEBT-011 | Realtime channel lifecycle relies on registry discipline rather than an enforced contract | Presence | Subscription races can reappear | M2 |
| DEBT-012 | Analytics event schema is not machine-validated at emission | Analytics | Schema drift and PII risk | M3 |

## J.3 Long-term — M4 and beyond

| ID | Debt | Owner | Impact | Target |
|---|---|---|---|---|
| DEBT-013 | Android and iOS adapter surfaces are unimplemented for several contracts | All | Capability rows stay `investigating` | M4 |
| DEBT-014 | No cross-product extraction path exercised for shared capabilities | Platform | [G](./G-platform-foundation.md) readiness is theoretical | Post-v2.0 |
| DEBT-015 | Event store growth has no compaction or archival strategy | Timeline | Replay cost grows with room history | M4 |
| DEBT-016 | Po tool registry lacks automated compliance regression coverage beyond the prompt suite | AI/Po | Prohibited-action coverage depends on the suite's breadth | M7 |
| DEBT-017 | Feature flags lack an enforced removal milestone check | Governance | Flags become permanent configuration | M5 |

## J.4 Debt policy

1. New debt is recorded here in the same change that creates it.
2. Debt with no target milestone cannot be merged.
3. The register is reviewed at every Production gate ([K.6](./K-launch-certification.md#k6-gates)).
4. Debt promoted to Immediate blocks the current milestone's release gate.
