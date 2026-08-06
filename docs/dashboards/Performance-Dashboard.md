<!-- GENERATED FILE — do not edit by hand. Produced by `scripts/report-performance.mjs`. -->

# Performance Dashboard

Run: `RUN-M0R-001` · Commit: `ca4cb39` · Environment: `local-dev` · Region: `unknown`

A metric with no measurement in this run reads **Unknown**. A Certified Threshold is only set by a human after a Measured Baseline exists (C4 rule 5). `blocked` and `unmeasured` never count as pass.

## Three-value budget

| Metric | Percentile | Provisional target | Measured baseline | Certified threshold | Samples | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Invite latency (invite → join) | p95 | 2000 ms | 1993 ms | Unknown | 5 | pass |
| Ready propagation | p95 | 250 ms | 18 ms | Unknown | 10 | pass |
| Countdown spread | p95 | 200 ms | 19 ms | Unknown | 10 | pass |
| Reconnect recovery | p95 | 3000 ms | 150 ms | Unknown | 5 | pass |
| Clock offset | p95 | 1000 ms | 824 ms | Unknown | 10 | pass |
| Room lifecycle recovery after outage | p95 | 5000 ms | 310 ms | Unknown | 1 | pass |
| Voice join latency | p95 | 1500 ms | Unknown | Unknown | Unknown | blocked |

## Historical comparison

| Run | invite_to_join | ready_propagation | countdown_spread | reconnect_recovery | clock_offset | outage_recovery | voice_join |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RUN-M0R-001` | 1993 ms | 18 ms | 19 ms | 150 ms | 824 ms | 310 ms | Unknown |

## Measurement notes

- **Invite latency (invite → join)** (`CERT-PERF-01`): Room creation → guest code discovery, backend path only. UI-inclusive invite-to-join remains UNMEASURED.
- **Ready propagation** (`CERT-PERF-02`): Realtime broadcast publish→receive latency between two independent clients. Transport-level baseline; excludes UI render time.
- **Countdown spread** (`CERT-PERF-03`): Delivery-time spread of one start signal across two independent subscribers on one host. Single-host measurement understates real-world spread.
- **Reconnect recovery** (`CERT-PERF-05`): Cold realtime channel establishment time (proxy for post-outage resubscribe). Full client reconnect+reconcile remains UNMEASURED pending PROF-04 UI runs.
- **Clock offset** (`CERT-PERF-04`): Absolute offset between local clock and server Date header, HTTP-midpoint estimated. Second-granularity header caps resolution at ~1000ms.
- **Room lifecycle recovery after outage** (`CERT-RES-01-chromium`): 5s client-side outage, then reload. Measures public shell recovery only; authenticated room reconciliation remains UNMEASURED.
- **Voice join latency** (`CERT-VOICE-01`): Blocked by PROF-08 (unsupported): BLOCKING: no LiveKit test project is provisioned. Voice rows cannot be certified.
