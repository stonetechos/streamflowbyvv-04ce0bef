# Certification Profiles — Executable Definitions

**Status:** Normative. Produced by M0 Remediation (WP3).
**Source of truth:** `tests/certification/profiles/certification-profiles.ts` (this document describes it; the code is authoritative).

Each Constitution profile is a named, reusable execution condition. A certification row cites the
profile it ran under; a row measured under `PROF-01` may not be presented as evidence for degraded
conditions.

| Profile | Name                | Condition                                  | Support in current harness                                                                                                                                 |
| ------- | ------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PROF-01 | Nominal             | Unshaped local network, warm client        | supported                                                                                                                                                  |
| PROF-02 | High latency        | +300 ms RTT applied to app traffic         | supported (request-level delay)                                                                                                                            |
| PROF-03 | Packet loss         | 3 % loss on the realtime transport         | **unsupported** — Chromium DevTools emulation cannot drop packets on an established WebSocket; would require an OS-level shaper the sandbox does not grant |
| PROF-04 | Transient outage    | Transport severed, then restored           | supported                                                                                                                                                  |
| PROF-05 | Cold start          | No warm cache, first paint measured        | supported                                                                                                                                                  |
| PROF-06 | Constrained device  | 4× CPU throttle                            | supported                                                                                                                                                  |
| PROF-07 | Multi-participant   | 4 concurrent identities in one room        | supported                                                                                                                                                  |
| PROF-08 | Voice under load    | Two live audio publishers                  | **unsupported** — no media server credentials in the certification environment                                                                             |
| PROF-09 | Accessibility sweep | Keyboard reachability and accessible names | supported                                                                                                                                                  |

## Blocking semantics

`unsupported` is a first-class result, not a gap to paper over. Any row whose profile is
`unsupported` is written as `blocked` with the reason above, and the Constitution's release gate
treats `blocked` as _not certified_. Two consequences today:

- Packet-loss resilience (PROF-03) is **not** certified for any engine.
- All voice rows (`CERT-VOICE-01`, `CERT-VOICE-02`) are **not** certified.

Both are unblocked by environment work, not by product code: a network shaper in CI, and media
server credentials scoped to the certification project.
