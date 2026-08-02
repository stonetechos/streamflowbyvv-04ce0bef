# Sprint 1.3 — Persistence Decoupling & Architecture Hardening

Status: Complete
Traceability: Foundation Specification v1.0 §2 (layering), §7 (Repository layer);
Database Specification v1.0; Build Rules v1.0 §3 (scope discipline), §6 (Git discipline).

## Objective

Make StreamFlow independent of any single persistence vendor. The application
depends on contracts owned by the Repository layer; exactly one folder inside
Infrastructure knows which engine is deployed.

## What changed

### 1. Vendor-neutral persistence contracts (`src/repository/`)

| File | Contract |
| --- | --- |
| `persistence.types.ts` | `PersistenceDriverKind`, `PersistenceScope`, `PersistenceConnectionStatus`, `PersistenceConnection`, `PersistenceAdapterDescriptor`, `PersistenceRecord` |
| `mapping.ts` | `EntityMapper`, `defineMapper`, `mapRecords`, `mapPage` |
| `index.ts` | Single public surface for the layer |

No file in `src/repository/` imports a driver, a generated schema type, or the
integration folder.

### 2. Configuration named for the role, not the vendor

`SupabaseClientConfig` → `PersistenceClientConfig`; `appConfig.supabase` →
`appConfig.persistence`; fields `url`/`publishableKey` → `endpointUrl`/`publicKey`.
Environment variable names are unchanged — the hosting platform owns those, and
renaming them would be an unrelated, breaking change.

### 3. Adapter seam (`src/infrastructure/persistence/index.ts`)

Re-exports the active adapter under neutral names and publishes
`ACTIVE_PERSISTENCE_ADAPTER`. Replacing the engine means editing this file plus
adding one sibling adapter folder. Generated schema types, driver clients, and
query builders are deliberately **not** re-exported.

`src/infrastructure/index.ts` no longer re-exports the Supabase adapter; the
barrel was the path by which generated types could escape the layer.

### 4. Entity mapping

`EntityMapper` gives every future repository a required translation step from a
persistence record to a domain entity. Database row shapes cannot reach Domain
by structural typing alone.

### 5. Migration portability audit

| Construct | Verdict |
| --- | --- |
| Tables, columns, constraints, indexes, triggers | Portable PostgreSQL |
| `gen_random_uuid()`, `jsonb`, `timestamptz`, `citext` | Portable (contrib) |
| RLS policies and `SECURITY DEFINER` helpers | Portable |
| `GRANT ... TO authenticated / anon / service_role` | Role names are a hosting convention; roles can be created on any server |
| `auth.uid()` | **Was** the only hard coupling — one call site |

Migration 010 replaces that call site with `public.current_auth_user_id()`,
which uses hosted auth when the schema is present and falls back to the standard
`app.current_user_id` session setting otherwise. Behaviour on the current
backend is identical; no policy was changed.

### 6. Automated guard

`scripts/check-architecture.mjs` (`bun run arch:check`) fails on any reference to
a driver package, generated schema types, or the vendor adapter module from
outside `src/infrastructure/` and `src/integrations/`. Plain Node, no
dependencies — it runs under any CI.

## Verification

- `bun run arch:check` — passed, zero violations
- `tsgo --noEmit` — passed
- `bun run build` — passed
- Database — 2 languages, 5 providers, both principal functions present, no schema drift

## Out of scope (unchanged)

Auth flows, repositories for concrete aggregates, realtime, UI features, and Po,
which remains non-operational.
