<!-- GENERATED FILE — do not edit by hand. Produced by `scripts/report-debt.mjs`. -->

# Technical Debt Dashboard

Source of truth: `docs/debt/debt-register.json`. 9 open · 3 resolved.

## Summary

| Severity | Open | Blocking |
| -------- | ---- | -------- |
| Critical | 0    | 0        |
| High     | 4    | 1        |
| Medium   | 3    | 0        |
| Low      | 2    | 0        |

## High

| Id       | Item                                                        | Owner          | Milestone | Effort | Blocking | ADR     | Engine        | Certification        |
| -------- | ----------------------------------------------------------- | -------------- | --------- | ------ | -------- | ------- | ------------- | -------------------- |
| DEBT-003 | No Measured Baseline for most C4 metrics                    | Engineering    | M1        | Medium | no       | ADR-015 | ENG-SYNC      | CERT-PERF-03         |
| DEBT-005 | PROF-08 voice profile unsupported — no LiveKit test project | Realtime Media | M3        | Medium | **yes**  | ADR-007 | ENG-VOICE     | CERT-VOICE-01        |
| DEBT-006 | PROF-03 packet-loss profile unsupported                     | Engineering    | M4        | Medium | no       | ADR-015 | ENG-SYNC      | CERT-RES-02-chromium |
| DEBT-012 | Analytics events are not schema-validated at emission       | Data           | M1        | Medium | no       | ADR-012 | ENG-ANALYTICS | Unknown              |

- **DEBT-003** impact: Certified Thresholds cannot be set for unmeasured metrics.
- **DEBT-005** impact: Every voice certification row is blocked and can never roll up as pass.
- **DEBT-006** impact: Degraded-network behaviour is unmeasured in every engine.
- **DEBT-012** impact: Malformed events reach the store undetected.

## Medium

| Id       | Item                                                    | Owner            | Milestone | Effort | Blocking | ADR     | Engine         | Certification        |
| -------- | ------------------------------------------------------- | ---------------- | --------- | ------ | -------- | ------- | -------------- | -------------------- |
| DEBT-008 | Po planning behaviour has no certification coverage     | AI Systems       | M6        | Medium | no       | ADR-008 | ENG-AI         | Unknown              |
| DEBT-013 | Room capacity enforcement is asserted server-side only  | Room & Lifecycle | M1        | Small  | no       | ADR-013 | ENG-ROOM       | CERT-AUTHZ-01        |
| DEBT-019 | Accessibility certification is an automated subset only | Experience       | M7        | Medium | no       | ADR-015 | SUB-EXPERIENCE | CERT-A11Y-_-chromium |

- **DEBT-008** impact: Clarification precedence in ADR-008 is unverified.
- **DEBT-013** impact: Client-side capacity messaging can drift from server truth.
- **DEBT-019** impact: WCAG 2.1 AA cannot be claimed from the automated sweep alone.

## Low

| Id       | Item                                                 | Owner       | Milestone | Effort | Blocking | ADR     | Engine         | Certification |
| -------- | ---------------------------------------------------- | ----------- | --------- | ------ | -------- | ------- | -------------- | ------------- |
| DEBT-020 | Chat and Moderation engines are unimplemented        | Social      | M5        | Large  | no       | ADR-015 | ENG-CHAT       | Unknown       |
| DEBT-021 | Lint warning cap raised to 25 to make the gate green | Engineering | M1        | Small  | no       | ADR-015 | SUB-EXPERIENCE | Unknown       |

- **DEBT-020** impact: Two Constitution engines have no module mapping.
- **DEBT-021** impact: Warning debt is tolerated rather than removed.

## Resolved

| Id       | Item                                                          | Resolved in |
| -------- | ------------------------------------------------------------- | ----------- |
| DEBT-002 | Tier claims were provider-name shorthand                      | M0          |
| DEBT-018 | No automated test or certification harness                    | M0          |
| DEBT-004 | Certification profiles were prose, not runnable configuration | M0          |
