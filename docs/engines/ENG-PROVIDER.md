<!-- GENERATED FILE — do not edit by hand. Produced by `scripts/report-engines.mjs`. -->

# Provider Engine — Engine Health

**Id** `ENG-PROVIDER` · **Owner** Provider & Capability · **Status** Certified · **Evidence run** `RUN-M0R-001`

## Module coverage

| Path                           | Present |
| ------------------------------ | ------- |
| `src/domain/providers`         | yes     |
| `src/repository/providers`     | yes     |
| `src/infrastructure/providers` | yes     |

## Certification

| Row                       | Profile | Status | Detail                                                           |
| ------------------------- | ------- | ------ | ---------------------------------------------------------------- |
| `CERT-PROV-A1-name-based` | PROF-01 | pass   | 6 provider keys resolve to Tier C without a certification tuple. |
| `CERT-PROV-A1-registry`   | PROF-01 | pass   | Registry holds 0 certified capabilities; all evidence-gated.     |

## Technical debt

No open items.

## Known risks

- Certification registry is empty: every provider resolves to Tier C. Zero Tier A, zero Tier B.
