# C4 — Performance Budget

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

## C4.1 The three-value rule

Every metric in this document records **three distinct values**:

| Value | Meaning | Binding? |
|---|---|---|
| **Provisional Target** | Design-time intent, set before measurement | **No.** Never a production commitment. |
| **Measured Baseline** | What the system actually does today, with date, build, and method | No — it is evidence |
| **Certified Threshold** | The pass/fail bar enforced at the release gate | **Yes.** This is the only binding number. |

Rules:

1. A Provisional Target must never be quoted externally, in marketing, in a status page, in an SLA, or in UI copy as a guarantee.
2. A Certified Threshold may only be set after a Measured Baseline exists for that metric on that platform.
3. A metric with `—` in Certified Threshold is **not yet gating**; the certification row referencing it is non-blocking until it is.
4. Certified Thresholds are ratcheted by ADR only. Loosening one requires a numbered ADR with justification.
5. Every measurement names the [certification profiles](./K-launch-certification.md#k5-certification-profiles) it was taken under. A number without a profile is meaningless.

Measured Baseline values below are marked `TBD (M0)`: M0 exists in part to produce them. Publishing this document with unmeasured baselines is expected; publishing a Certified Threshold without a baseline is not permitted.

## C4.2 Interaction and join metrics

| Metric | Definition | Profiles | Provisional Target | Measured Baseline | Certified Threshold |
|---|---|---|---|---|---|
| Invite-to-join latency | Invite link opened → room surface interactive, authenticated user | Normal, High Latency | ≤ 2.5 s p75 | TBD (M0) | — |
| Invite-to-join latency, cold sign-in | Invite link opened → room surface, unauthenticated user completing sign-in | Normal | ≤ 12 s p75 excluding user typing | TBD (M0) | — |
| Room create latency | Create action → room `open` and invitable | Normal | ≤ 1.2 s p75 | TBD (M0) | — |
| Ready propagation latency | Member marks ready → all peers observe it | Normal, High Latency, Packet Loss | ≤ 700 ms p95 | TBD (M0) | — |
| Late-join context load | Join of an `active` room → correct stage rendered | Late Join | ≤ 2.0 s p75 | TBD (M0) | — |

## C4.3 Synchronization metrics

| Metric | Definition | Profiles | Provisional Target | Measured Baseline | Certified Threshold |
|---|---|---|---|---|---|
| Countdown spread | Max delta between participants' countdown-zero instants | Normal, High Latency, Packet Loss | ≤ 250 ms p95 | TBD (M0) | — |
| Clock offset accuracy | Estimated vs actual server offset | Normal, High Latency | ≤ 120 ms p95 | TBD (M0) | — |
| Tier A start alignment | Delta between participants' first playback frame | Normal | ≤ 400 ms p95 | TBD (M0) | — |
| Tier A steady-state drift | Position delta during uninterrupted playback | Normal | ≤ 500 ms p95 | TBD (M0) | — |
| Drift detection latency | Drift exceeding threshold → user informed | Normal, Packet Loss | ≤ 3 s | TBD (M0) | — |
| Catch-up convergence | Catch-up accepted → within tolerance | Normal | ≤ 2 s | TBD (M0) | — |

## C4.4 Voice metrics

| Metric | Definition | Profiles | Provisional Target | Measured Baseline | Certified Threshold |
|---|---|---|---|---|---|
| Voice connection latency | Join intent → first audio path established | Normal, High Latency | ≤ 2.0 s p75 | TBD (M0) | — |
| Voice mouth-to-ear | End-to-end audio delay | Normal | ≤ 300 ms p95 | TBD (M0) | — |
| Voice reconnect | Transport loss → audio restored | Temporary Disconnect | ≤ 5 s p75 | TBD (M0) | — |
| Voice denial handling | Permission denied → fallback state presented | Normal | ≤ 500 ms | TBD (M0) | — |

## C4.5 Resilience metrics

| Metric | Definition | Profiles | Provisional Target | Measured Baseline | Certified Threshold |
|---|---|---|---|---|---|
| Realtime reconnect recovery | Transport loss → projection rebuilt and consistent | Temporary Disconnect, Packet Loss | ≤ 4 s p75 | TBD (M0) | — |
| Foreground resume | App foregrounded → correct room state rendered | Background/Foreground | ≤ 1.5 s p75 | TBD (M0) | — |
| Rejoin restoration | Rejoin within grace → context and position awareness restored | Leave/Rejoin | ≤ 3 s p75 | TBD (M0) | — |
| Host disconnect survival | Host drops → room remains recoverable | Host Disconnect | 100% within grace | TBD (M0) | — |

## C4.6 Client resource metrics

| Metric | Definition | Profiles | Provisional Target | Measured Baseline | Certified Threshold |
|---|---|---|---|---|---|
| Cold launch | Process start → first interactive surface | Normal | ≤ 3.0 s p75 mid-tier device | TBD (M0) | — |
| Warm launch | Resume → interactive | Background/Foreground | ≤ 1.0 s p75 | TBD (M0) | — |
| Memory, active room with voice | Peak resident set | Normal | ≤ 350 MB | TBD (M0) | — |
| CPU, active room with voice | Sustained average | Normal | ≤ 25% mid-tier device | TBD (M0) | — |
| Battery impact | Drain per hour in an active voice room | Normal | ≤ 12% / hour mid-tier device | TBD (M0) | — |
| Network utilization, idle room | Sustained realtime overhead, no voice | Normal | ≤ 15 kbps | TBD (M0) | — |
| Network utilization, voice room | Sustained per participant | Normal | ≤ 60 kbps | TBD (M0) | — |

## C4.7 Measurement discipline

- Percentiles are computed over a minimum of 30 runs per profile per platform.
- Every baseline records: date, build identifier, platform, device class, network profile, participant count.
- Baselines expire after 90 days or on any release that changes the owning engine; an expired baseline invalidates its Certified Threshold until re-measured.
- Baselines and thresholds are referenced from certification rows in [K](./K-launch-certification.md) via the *Evidence Link* column.
