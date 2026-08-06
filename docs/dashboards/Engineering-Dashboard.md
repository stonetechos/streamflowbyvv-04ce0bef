# Engineering Dashboard

Entry point for the StreamFlow engineering state. Everything linked here is generated from evidence
on disk; nothing is hand-asserted.

## Dashboards

| Dashboard                                           | Answers                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| [Release Dashboard](./Release-Dashboard.md)         | Can we ship? Green / Amber / Red with open blockers                             |
| [Performance Dashboard](./Performance-Dashboard.md) | Provisional target vs measured baseline vs certified threshold                  |
| [Coverage Report](./Coverage-Report.md)             | Architecture, certification, Playwright, engine, capability, milestone coverage |
| [Technical Debt](./Technical-Debt.md)               | What is owed, by whom, blocking what                                            |
| [Milestone Coverage](./Milestone-Coverage.md)       | Which milestone gates are satisfied by evidence                                 |
| [Engine Health](../engines/README.md)               | One report per engine + Experience Subsystem                                    |

## Regenerate

```bash
npm run release-check   # dashboards only, from existing evidence
npm run certify         # full pipeline: measure, then regenerate
```

## Guides

- [Certification Pipeline Guide](../certification/Certification-Pipeline-Guide.md)
- [Evidence Guide](../certification/Evidence-Guide.md)
- [CI/CD Guide](../development/CI-CD-Guide.md)
- [Release Guide](../development/Release-Guide.md)
- [Developer Infrastructure Report](../development/Developer-Infrastructure-Report.md)
