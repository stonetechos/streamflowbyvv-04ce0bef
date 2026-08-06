<!-- GENERATED FILE — do not edit by hand. Produced by `scripts/report-engines.mjs`. -->

# Experience Subsystem — Engine Health

**Id** `SUB-EXPERIENCE` · **Owner** Experience · **Status** Certified · **Evidence run** `RUN-M0R-001`

## Module coverage

| Path | Present |
| --- | --- |
| `src/design-system` | yes |
| `src/foundation/accessibility` | yes |
| `src/foundation/localization` | yes |
| `src/foundation/theme` | yes |
| `src/app-shell` | yes |

## Certification

| Row | Profile | Status | Detail |
| --- | --- | --- | --- |
| `CERT-A11Y-_-chromium` | PROF-09 | pass | No unnamed interactive controls found. Automated subset only — manual WCAG 2.1 AA audit still required. |
| `CERT-A11Y-_auth-chromium` | PROF-09 | pass | No unnamed interactive controls found. Automated subset only — manual WCAG 2.1 AA audit still required. |

## Technical debt

| Id | Severity | Milestone | Blocking | Item |
| --- | --- | --- | --- | --- |
| DEBT-019 | Medium | M7 | no | Accessibility certification is an automated subset only |
| DEBT-021 | Low | M1 | no | Lint warning cap raised to 25 to make the gate green |

## Known risks

- Automated accessibility sweep covers unnamed controls only; a manual WCAG 2.1 AA audit is still required.
- Cross-cutting presentation only — holds no business state or authority.
