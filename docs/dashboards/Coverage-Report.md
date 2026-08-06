<!-- GENERATED FILE — do not edit by hand. Produced by `scripts/report-coverage.mjs`. -->

# Coverage Report

Run: `RUN-M0R-001`. Vocabulary: **Implemented** (code exists) · **Measured** (evidence exists, not all pass) · **Certified** (all matching rows pass) · **Blocked** (a profile is unsupported) · **Unknown** (no evidence).

## Architecture coverage

| Layer          | Modules | Guarded by   | Status      |
| -------------- | ------- | ------------ | ----------- |
| Presentation   | 25      | `arch:check` | Implemented |
| Feature        | 14      | `arch:check` | Implemented |
| Domain         | 14      | `arch:check` | Implemented |
| Repository     | 12      | `arch:check` | Implemented |
| Infrastructure | 14      | `arch:check` | Implemented |
| Foundation     | 7       | `arch:check` | Implemented |
| Design System  | 2       | `arch:check` | Implemented |

## Certification coverage

| Row group    | Pass | Fail | Unmeasured | Blocked |
| ------------ | ---- | ---- | ---------- | ------- |
| `CERT-A11Y`  | 2    | 0    | 0          | 0       |
| `CERT-AUTHZ` | 6    | 0    | 1          | 0       |
| `CERT-PERF`  | 5    | 0    | 0          | 0       |
| `CERT-PROV`  | 2    | 0    | 0          | 0       |
| `CERT-RES`   | 2    | 0    | 0          | 0       |
| `CERT-SA`    | 5    | 0    | 0          | 0       |
| `CERT-VOICE` | 0    | 0    | 0          | 2       |

## Playwright coverage

| Suite           | Specs | Status      |
| --------------- | ----- | ----------- |
| `accessibility` | 1     | Implemented |
| `provider`      | 1     | Implemented |
| `realtime`      | 1     | Implemented |
| `resilience`    | 1     | Implemented |
| `room`          | 2     | Implemented |
| `voice`         | 1     | Implemented |

## Engine coverage

| Engine                                                | Owner                 | Code        | Certification | Open debt |
| ----------------------------------------------------- | --------------------- | ----------- | ------------- | --------- |
| [Room Engine](../engines/ENG-ROOM.md)                 | Room & Lifecycle      | Implemented | Measured      | 1         |
| [Timeline Engine](../engines/ENG-TIMELINE.md)         | Room & Lifecycle      | Implemented | Unknown       | 0         |
| [Watch Party Engine](../engines/ENG-WATCHPARTY.md)    | Watch Party           | Implemented | Unknown       | 0         |
| [Sync Engine](../engines/ENG-SYNC.md)                 | Sync & Clock          | Implemented | Certified     | 2         |
| [Voice Engine](../engines/ENG-VOICE.md)               | Realtime Media        | Implemented | Blocked       | 1         |
| [Chat Engine](../engines/ENG-CHAT.md)                 | Social                | Unknown     | Unknown       | 1         |
| [Presence Engine](../engines/ENG-PRESENCE.md)         | Realtime              | Implemented | Certified     | 0         |
| [Provider Engine](../engines/ENG-PROVIDER.md)         | Provider & Capability | Implemented | Certified     | 0         |
| [Notification Engine](../engines/ENG-NOTIFICATION.md) | Engagement            | Implemented | Unknown       | 0         |
| [Community Engine](../engines/ENG-COMMUNITY.md)       | Social                | Implemented | Unknown       | 0         |
| [AI / Po Engine](../engines/ENG-AI.md)                | AI Systems            | Implemented | Unknown       | 1         |
| [Analytics Engine](../engines/ENG-ANALYTICS.md)       | Data                  | Implemented | Unknown       | 1         |
| [Moderation Engine](../engines/ENG-MODERATION.md)     | Trust & Safety        | Unknown     | Unknown       | 0         |
| [Experience Subsystem](../engines/SUB-EXPERIENCE.md)  | Experience            | Implemented | Certified     | 2         |

## Capability coverage

Tier resolution is evidence-gated through `capability-certification.ts`.

| Tier                        | Capabilities  | Source                          |
| --------------------------- | ------------- | ------------------------------- |
| Tier A (true sync)          | 0             | certification registry is empty |
| Tier B (assisted)           | 0             | certification registry is empty |
| Tier C (coordinated manual) | all providers | default, no tuple required      |

Registry guard status: Certified.

## Milestone coverage

| Milestone | Name                                     | Declared status | Gate status |
| --------- | ---------------------------------------- | --------------- | ----------- |
| M0        | Architecture Conformance & Certification | complete        | Measured    |
| M0.5      | Developer Infrastructure                 | in-progress     | Certified   |
| M1        | Room & Watch Party Build                 | not-started     | Certified   |
| M2        | Sync & Clock Certification               | not-started     | Certified   |
| M3        | Voice & Presence                         | not-started     | Blocked     |
| M4        | Resilience & Scale                       | not-started     | Certified   |
| M5        | Community & Chat                         | not-started     | Unknown     |
| M6        | AI / Po                                  | not-started     | Unknown     |
| M7        | Launch Certification                     | not-started     | Blocked     |
