<!-- GENERATED FILE — do not edit by hand. Produced by `scripts/report-engines.mjs`. -->

# Analytics Engine — Engine Health

**Id** `ENG-ANALYTICS` · **Owner** Data · **Status** Implemented · Unknown certification · **Evidence run** `RUN-M0R-001`

## Module coverage

| Path                     | Present |
| ------------------------ | ------- |
| `src/foundation/logging` | yes     |

## Certification

No certification row targets this engine. Coverage is **Unknown**, not pass.

## Technical debt

| Id       | Severity | Milestone | Blocking | Item                                                  |
| -------- | -------- | --------- | -------- | ----------------------------------------------------- |
| DEBT-012 | High     | M1        | no       | Analytics events are not schema-validated at emission |

## Known risks

- Analytics events are not schema-validated at emission.
