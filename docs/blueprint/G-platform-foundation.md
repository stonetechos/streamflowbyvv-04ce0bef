# G — Platform Foundation

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

## G.1 Purpose

StreamFlow is the first product on the Vedora Vision platform. Several of its subsystems are not StreamFlow-specific and should be built so a second product can adopt them without a rewrite. This chapter names them, sets the extraction bar, and forbids premature extraction.

## G.2 Candidate shared capabilities

| Capability                    | StreamFlow home today                            | Shared potential | Extraction bar                         |
| ----------------------------- | ------------------------------------------------ | ---------------- | -------------------------------------- |
| Identity and profiles         | `src/infrastructure/identity`, `domain/profiles` | High             | Second product needs accounts          |
| Social graph                  | `domain/social`                                  | High             | Second product needs friends/blocks    |
| Notification delivery         | `domain/services/notification-service.ts`        | High             | Two products, two channel sets         |
| Feature flags                 | `domain/services/feature-flag-service.ts`        | High             | Cross-product flag targeting needed    |
| Localization                  | `domain/services/localization-service.ts`        | High             | Shared locale set beyond EN, HI-IN     |
| Analytics schema and pipeline | `domain/services/analytics-service.ts`           | High             | Cross-product KPI reporting            |
| Compliance service            | `domain/services/compliance-service.ts`          | High             | Second product has provider risk       |
| Event bus and event store     | `domain/events`, `infrastructure/events`         | Medium           | Second product needs event sourcing    |
| Realtime channel registry     | `infrastructure/rooms`                           | Medium           | Second product needs presence          |
| Design system and tokens      | `src/styles.css`, Experience Engine              | High             | Shared brand system defined            |
| AI adapter layer              | `infrastructure/ai`                              | Medium           | Second product needs model-agnostic AI |
| Voice transport adapter       | `infrastructure/voice`                           | Low              | StreamFlow-specific for now            |

## G.3 Extraction rules

1. **Do not extract before the second consumer exists.** One consumer is not a platform; it is speculation.
2. Extraction is an architectural change and requires a numbered ADR.
3. A shared capability may not import any StreamFlow domain type.
4. A shared capability carries its own certification rows; consumers do not re-certify its internals, only their integration.
5. Extraction must not change a StreamFlow contract in the same change.

## G.4 Portability invariants preserved for platform readiness

- Vendor coupling stays in Infrastructure ([C5](./C5-product-principles.md) P9).
- Human-readable prefixed codes (`ROM-000001`, `USR-000001`) remain product-scoped so a shared identity store can namespace them.
- No Lovable-specific dependency enters application architecture.
- The database schema stays portable PostgreSQL; Supabase coupling is confined to `profiles.auth_user_id` and RLS policy expression.

## G.5 Non-goals for v2.0

No shared services are extracted during M0–M7. This chapter is a readiness contract, not a work item.
