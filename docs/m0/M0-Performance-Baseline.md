# M0 — Performance Baseline

Audit date: 2026-08-06
Build: `streamflow` v1.0.0-rc.1
Authority: [C4-performance-budget.md](../blueprint/C4-performance-budget.md)

## Reading rule

[C4.1](../blueprint/C4-performance-budget.md) defines three values per metric. This document fills **only the middle column** — Measured Baseline — and may fill it with one of exactly three states:

| State                | Meaning                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Measured**         | A number produced by an instrumented run, with date, build, platform, and named [K.5](../blueprint/K-launch-certification.md) profile |
| **Not Yet Measured** | Instrumentation is possible today; the run has not been performed                                                                     |
| **Unknown**          | Cannot be measured today — the capability, platform, or instrumentation point does not exist                                          |

**No metric in this document is estimated, inferred, or fabricated.** C4.1 rule 5 states that a number without a named profile is meaningless; since [GAP-004](./M0-Gap-Analysis.md) establishes that no profile is expressible as a runnable configuration, **no measurement taken today could be valid even if performed**.

Therefore: **the Measured Baseline column is empty across all 28 metrics**, and this is the correct M0 result rather than a failure to try.

## Why nothing was measured

Three blocking preconditions, all documented in the Gap Analysis:

1. **GAP-003** — no certification harness is committed to the repository. There is no `*.test.*`, no `*.spec.*`, and no test runner in `package.json`. `bun run verify` executes format, lint, and `arch:check` only.
2. **GAP-004** — the nine certification profiles (Normal, High Latency, Packet Loss, Temporary Disconnect, Background/Foreground, Late Join, Leave/Rejoin, Host Disconnect, Member Disconnect) exist only as prose in K.5. A measurement not taken under a named profile cannot become a Certified Threshold.
3. **C4.7 discipline** — percentiles require a minimum of 30 runs per profile per platform, and every baseline must record date, build, platform, device class, network profile, and participant count. No such recording apparatus exists.

Producing a single ad-hoc number today would violate C4.1 rule 2 by creating the appearance of a baseline that could later be misread as licensing a Certified Threshold. That is the precise failure mode the three-value rule was written to prevent.

## C4.2 Interaction and join metrics

| Metric                               | Provisional Target (from C4) | Measured Baseline | State            | Blocker                              |
| ------------------------------------ | ---------------------------- | ----------------- | ---------------- | ------------------------------------ |
| Invite-to-join latency               | ≤ 2.5 s p75                  | —                 | Not Yet Measured | GAP-003, GAP-004                     |
| Invite-to-join latency, cold sign-in | ≤ 12 s p75                   | —                 | Not Yet Measured | GAP-003, GAP-004                     |
| Room create latency                  | ≤ 1.2 s p75                  | —                 | Not Yet Measured | GAP-003, GAP-004                     |
| Ready propagation latency            | ≤ 700 ms p95                 | —                 | Not Yet Measured | GAP-003, GAP-004                     |
| Late-join context load               | ≤ 2.0 s p75                  | —                 | Not Yet Measured | GAP-003, GAP-004 (Late Join profile) |

All five are instrumentable today — the code paths exist and are exercised in production. These are the **highest-value first measurements** once a harness lands.

## C4.3 Synchronization metrics

| Metric                    | Provisional Target | Measured Baseline | State            | Note                                                                                                               |
| ------------------------- | ------------------ | ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Countdown spread          | ≤ 250 ms p95       | —                 | Not Yet Measured | `countdown-machine.ts` has no emitted zero-instant timestamp to sample                                             |
| Clock offset accuracy     | ≤ 120 ms p95       | —                 | Not Yet Measured | `clock-sync-engine.ts` computes an offset; nothing records it                                                      |
| Tier A start alignment    | ≤ 400 ms p95       | —                 | **Unknown**      | No Tier A adapter exists ([GAP-001](./M0-Gap-Analysis.md)); there is no first playback frame to measure            |
| Tier A steady-state drift | ≤ 500 ms p95       | —                 | **Unknown**      | As above                                                                                                           |
| Drift detection latency   | ≤ 3 s              | —                 | Not Yet Measured | `drift-engine.ts` operates on reported position; measurable in Tier C                                              |
| Catch-up convergence      | ≤ 2 s              | —                 | **Unknown**      | Catch-up is advisory guidance to a human; convergence depends on user action and needs a defined measurement point |

Two Unknowns here are the direct consequence of the Tier A gap. They cannot be resolved by measurement effort — only by building an adapter.

## C4.4 Voice metrics

| Metric                   | Provisional Target | Measured Baseline | State            | Note                                                                                             |
| ------------------------ | ------------------ | ----------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| Voice connection latency | ≤ 2.0 s p75        | —                 | Not Yet Measured | Instrumentable at `use-voice-session.ts`                                                         |
| Voice mouth-to-ear       | ≤ 300 ms p95       | —                 | **Unknown**      | Requires an audio-loopback rig; none exists, and headless Chromium cannot produce a valid figure |
| Voice reconnect          | ≤ 5 s p75          | —                 | Not Yet Measured | Requires the Temporary Disconnect profile                                                        |
| Voice denial handling    | ≤ 500 ms           | —                 | Not Yet Measured | Automatable with a denied-permission context                                                     |

## C4.5 Resilience metrics

| Metric                      | Provisional Target | Measured Baseline | State            | Note                                                                |
| --------------------------- | ------------------ | ----------------- | ---------------- | ------------------------------------------------------------------- |
| Realtime reconnect recovery | ≤ 4 s p75          | —                 | Not Yet Measured | Needs Temporary Disconnect + Packet Loss profiles                   |
| Foreground resume           | ≤ 1.5 s p75        | —                 | Not Yet Measured | Needs Background/Foreground profile                                 |
| Rejoin restoration          | ≤ 3 s p75          | —                 | Not Yet Measured | Grace window is not parameterised ([GAP-004](./M0-Gap-Analysis.md)) |
| Host disconnect survival    | 100% within grace  | —                 | Not Yet Measured | Host-leave logic exists; grace value not named as a constant        |

## C4.6 Client resource metrics

| Metric                          | Provisional Target    | Measured Baseline | State            | Note                                                                      |
| ------------------------------- | --------------------- | ----------------- | ---------------- | ------------------------------------------------------------------------- |
| Cold launch                     | ≤ 3.0 s p75 mid-tier  | —                 | Not Yet Measured | No mid-tier reference device is defined anywhere in the documentation set |
| Warm launch                     | ≤ 1.0 s p75           | —                 | Not Yet Measured | As above                                                                  |
| Memory, active room with voice  | ≤ 350 MB              | —                 | Not Yet Measured | Measurable via CDP once a harness exists                                  |
| CPU, active room with voice     | ≤ 25% mid-tier        | —                 | **Unknown**      | Requires a defined reference device                                       |
| Battery impact                  | ≤ 12% / hour mid-tier | —                 | **Unknown**      | Requires physical devices; no native shell shipped                        |
| Network utilization, idle room  | ≤ 15 kbps             | —                 | Not Yet Measured | Measurable via CDP                                                        |
| Network utilization, voice room | ≤ 60 kbps             | —                 | Not Yet Measured | Measurable via CDP + LiveKit stats                                        |

## Tally

| State            | Metrics | Share of 28 |
| ---------------- | ------- | ----------- |
| Measured         | **0**   | 0%          |
| Not Yet Measured | 22      | 79%         |
| Unknown          | 6       | 21%         |

## Secondary observation: the reference device is undefined

Five C4.6 targets are expressed against a "mid-tier device" that the Constitution never defines. Until an ADR names a specific reference device class, those five metrics cannot produce a comparable baseline even with a working harness. This is a **documentation gap discovered during M0** and is recorded as an input to the Sprint 86 scope; it cannot be fixed here, since the Constitution is frozen.

## Consequence for the release gate

Per C4.1 rule 3, a metric with `—` in Certified Threshold is not yet gating. All 28 metrics have `—`. Therefore:

> **No certification row in [K.4](../blueprint/K-launch-certification.md) is currently gated on performance, and none can be until baselines exist.**

This means the [K.7](../blueprint/K-launch-certification.md) release gate today enforces functional correctness only — and, per [M0-Certification-Baseline.md](./M0-Certification-Baseline.md), it cannot enforce that either, because no harness exists.

## Recommended first measurement set

If Sprint 86 delivers only one thing, it should be these five, all instrumentable with existing code paths and all on the critical user journey:

1. Invite-to-join latency (Normal, High Latency)
2. Ready propagation latency (Normal, High Latency, Packet Loss)
3. Countdown spread (Normal, High Latency, Packet Loss)
4. Clock offset accuracy (Normal, High Latency)
5. Realtime reconnect recovery (Temporary Disconnect)

Those five cover the Room, Presence, Watch Party, Sync, and Timeline engines, and together they establish whether the coordinated-manual experience — the only sync mode StreamFlow actually ships — meets its own design intent.
