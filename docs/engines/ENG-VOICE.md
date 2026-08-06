<!-- GENERATED FILE — do not edit by hand. Produced by `scripts/report-engines.mjs`. -->

# Voice Engine — Engine Health

**Id** `ENG-VOICE` · **Owner** Realtime Media · **Status** Blocked · **Evidence run** `RUN-M0R-001`

## Module coverage

| Path                       | Present |
| -------------------------- | ------- |
| `src/features/voice`       | yes     |
| `src/infrastructure/voice` | yes     |
| `src/routes/api/voice`     | yes     |

## Certification

| Row             | Profile | Status  | Detail                                                                                                              |
| --------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `CERT-VOICE-01` | PROF-08 | blocked | Blocked by PROF-08 (unsupported): BLOCKING: no LiveKit test project is provisioned. Voice rows cannot be certified. |
| `CERT-VOICE-02` | PROF-08 | blocked | Live-transport assertion blocked by PROF-08. Static equivalent is certified as CERT-SA-01.                          |

## Technical debt

| Id       | Severity | Milestone | Blocking | Item                                                        |
| -------- | -------- | --------- | -------- | ----------------------------------------------------------- |
| DEBT-005 | High     | M3        | yes      | PROF-08 voice profile unsupported — no LiveKit test project |

## Known risks

- PROF-08 is unsupported: no LiveKit test project is provisioned, so every voice row is blocked.
