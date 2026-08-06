# Certification Harness

Executable Definition of Done for the StreamFlow Architecture Constitution v2.0.0.

```bash
npm run cert            # full run
npm run cert:check      # governance guard (schema completeness, no name-based tiers)
npx playwright test tests/certification/room --project=web-chromium
```

## Layout

| Path                                                                         | Purpose                                                                                             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `helpers/run-context.ts`                                                     | Deterministic run id, commit, environment, region                                                   |
| `helpers/evidence.ts`                                                        | Evidence records and metric percentiles (see `docs/certification/Certification-Evidence-Schema.md`) |
| `profiles/certification-profiles.ts`                                         | The nine execution profiles; `unsupported` profiles block their rows                                |
| `fixtures/backend.ts`                                                        | Ephemeral identities and rooms against the real backend                                             |
| `provider/`, `room/`, `realtime/`, `resilience/`, `accessibility/`, `voice/` | Row implementations                                                                                 |
| `evidence/<runId>/`                                                          | Output: `records/*.json`, `index.json`, artifacts                                                   |

## Environment

Set `CERT_CHROMIUM_PATH` when the image's bundled Chromium cannot launch. Set `CERT_RUN_ID`,
`CERT_ENVIRONMENT` and `CERT_REGION` in CI so evidence is attributable.

## Rules

1. A row that did not execute is `unmeasured`, never `pass`.
2. A threshold may only be asserted against a percentile the sample count supports.
3. Never assert a tier, budget, or capability from a provider name — `cert:check` fails the build.
