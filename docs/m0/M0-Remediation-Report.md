# M0 Remediation Report — Certification Enablement

**Run:** `RUN-M0R-001` · **Date:** 2026-08-06 · **Environment:** `local-dev` · **Region:** unknown
**Scope:** WP1–WP10 of the M0 Remediation Sprint. No product features, no UI redesign, no provider expansion.
**Supersedes the provisional numbers in:** `docs/m0/M0-Performance-Baseline.md` §Provisional Targets (targets remain; baselines are now measured).

---

## 1. Result in one line

The Constitution is now executable: 27 certification rows exist as code, 24 pass with machine-readable
evidence, 1 is `unmeasured`, 2 are `blocked` by an unsupported profile — and Tier A can no longer be
claimed by any provider without an evidence record.

## 2. Work packages

| WP | Outcome |
| --- | --- |
| WP1 Capability classification | `provider-tier.ts` rewritten: tier resolves only from a `source · adapter · platform · version · region` tuple matched against `capability-certification.ts`. The registry is **empty**, so all 18 providers resolve to Tier C with a machine-readable reason. Name-based tiering is impossible and guarded. |
| WP2 Harness | `playwright.config.ts` + `tests/certification/**` committed. Deterministic run id, per-run evidence directory, artifacts on failure. |
| WP3 Profiles | Nine profiles executable; PROF-03 and PROF-08 declared `unsupported` and therefore blocking (`docs/certification/Certification-Profiles.md`). |
| WP4 Baselines | Five baselines measured (§3). |
| WP5 Evidence schema | `docs/certification/Certification-Evidence-Schema.md`; enforced by `scripts/check-certification.mjs`. |
| WP6 Authentication ownership | `docs/adr/ADR-016-authentication-ownership.md` — Identity Boundary named, no 14th engine. |
| WP7 Authorization | Seven negative RLS rows; six pass, `AUTHZ-05` unmeasured (§4). |
| WP8 Server authority | Five rows pass: voice transport carries no domain mutation, version monotonicity is server-enforced, membership authority is `SECURITY DEFINER`, capability disclosure is not client-raisable, intent revisions persist server-side. |
| WP9 Hygiene | `cert:check` wired into `verify`; harness documented in `tests/certification/README.md`. |
| WP10 Reporting | This document. |

## 3. Measured baselines (WP4)

Percentiles in milliseconds. `p95` is reported only where the sample count supports it.

| Row | Metric | n | p50 | p95 | Failures | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CERT-PERF-01 | invite-to-join, end to end | 5 | 880 | 1993 | 0 | pass |
| CERT-PERF-02 | ready propagation, realtime round trip | 10 | 16 | 18 | 0 | pass |
| CERT-PERF-03 | countdown spread across two subscribers | 10 | 0 | 19 | 0 | pass |
| CERT-PERF-04 | client-vs-server clock offset | 10 | 762 | 824 | 0 | pass |
| CERT-PERF-05 | reconnect recovery after forced close | 5 | 128 | 150 | 0 | pass |
| CERT-RES-02 | cold start of the public shell | 5 | 310 | 342 | 0 | pass |

These are **Measured Baselines** in the Constitution's three-value scheme, taken on `local-dev` with an
unshaped network. They are not Certified Thresholds: a threshold requires the same metric measured on
a production-like environment under PROF-02, PROF-06 and PROF-07. Two observations worth carrying
forward: the clock-offset p50 of 762 ms is far larger than the 16 ms realtime round trip, so offset is
dominated by sampling method rather than transport and needs a tighter estimator before it can gate a
release; and invite-to-join p95 is more than twice p50 across only five samples, so the tail is not yet
characterised.

## 4. Rows that are not PASS

| Row | Status | Reason | Unblocked by |
| --- | --- | --- | --- |
| CERT-AUTHZ-05 (stale version writes refused) | unmeasured | No `room_state` row exists at the point the fixture reaches it, so the monotonicity trigger is never exercised. The invariant itself is separately evidenced by `CERT-SA-02`. | Fixture work: provision `room_state` during room creation. |
| CERT-VOICE-01 / CERT-VOICE-02 | blocked | PROF-08 unsupported — no media server credentials in the certification environment. | Scoped media credentials for CI. |
| Every PROF-03 row | blocked | Packet loss cannot be emulated on an established WebSocket from the browser. | OS-level shaper in CI. |

## 5. Effect on Build Readiness

The two blockers recorded in the M0 audit are closed:

- **Blocker 1 — unevidenced Tier A claim:** closed. Tier is tuple-and-registry derived; the registry is
  empty, so StreamFlow correctly advertises zero Tier A and zero Tier B capabilities.
- **Blocker 2 — no certification machinery:** closed. The harness is committed, runs in one command,
  and emits evidence that `cert:check` validates.

Certification baseline moves from **0/34 PASS** to **24 PASS / 1 unmeasured / 2 blocked** of the 27 rows
now implemented. The remaining Constitution rows are not yet implemented and stay `unmeasured` — they
are, by definition, not evidence of anything.

**Build Mode authorization is a gate the Constitution reserves for a human owner.** What this sprint
changes is that the decision now rests on executable evidence rather than on prose. The honest state:
the architecture's authority, authorization and classification invariants are certified on `local-dev`;
resilience under loss, voice, and multi-participant load are not certified anywhere.
