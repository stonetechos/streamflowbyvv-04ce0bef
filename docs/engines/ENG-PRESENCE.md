<!-- GENERATED FILE — do not edit by hand. Produced by `scripts/report-engines.mjs`. -->

# Presence Engine — Engine Health

**Id** `ENG-PRESENCE` · **Owner** Realtime · **Status** Certified · **Evidence run** `RUN-M0R-001`

## Module coverage

| Path | Present |
| --- | --- |
| `src/repository/rooms/presence-repository.types.ts` | yes |
| `src/infrastructure/events` | yes |

## Certification

| Row | Profile | Status | Detail |
| --- | --- | --- | --- |
| `CERT-PERF-02` | PROF-01 | pass | Realtime broadcast publish→receive latency between two independent clients. Transport-level baseline; excludes UI render time. |

## Technical debt

No open items.

## Known risks

- Ready propagation is measured at transport level only; UI render time is excluded.
