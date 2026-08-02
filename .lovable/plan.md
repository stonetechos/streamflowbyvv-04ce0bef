# StreamFlow — Documentation Consolidation v1.0 (Approved — awaiting build mode)

Writes are still blocked; the workspace toggle is set to Plan. Please switch it to **Build** and I will execute the following exactly as approved, with no restyling, no reorganization, and no new ADRs beyond ADR-013.

## Locked product decisions (applied throughout)

- **Launch locales:** English (`en`), Hindi (`hi-IN`). Localization must support unlimited future languages without redesign — locales are data, `language_code` stays BCP-47 validated (never a fixed enum), layout primitives direction-aware, CLDR plural categories.
- **System constants (fixed):** countdown default 5s, range 3–60s; invite expiry 24h; join link expiry 24h; room inactivity timeout 30 min; recent room retention 30 days; domain event retention 24 months; projection retention 90 days; Po session retention 30 days; analytics retention 12 months; sync bands Excellent ≤100 ms, Good 101–250 ms, Warning 251–500 ms, Re-sync Required >500 ms.

## Work items

1. **`docs/foundation/Foundation-Specification-v1.0.md`** — author the cited tie-breaker: layering, 13 domain services, repositories, event bus, Provider SDK, feature flags, local-first, cross-cutting strategies, security and legal compliance, database standards, documentation structure, mandatory workflow, plus normative sections for System Constants, Clock Synchronization, Error Taxonomy and localization key grammar, Localization (en + hi-IN), Local-First Cache, Rate-Limit Policy, Accepted Assumptions.
2. **Companion contracts** — `docs/api/domain-event-catalog-v1.0.md`, `docs/api/po-tool-registry.md`, `docs/foundation/storage-design-v1.0.md`.
3. **ADR-002 … ADR-013** — room lifecycle mapping · sync mode per room · read ownership · preference field ownership · email invite model · channels vs presentation modes · Po clarification precedence · admin authorization table · guest preview scope · block-during-active-room · retention invariant · room capacity envelope.
4. **Amend the MVP Functional Specification** — numbering, identity and cross-references preserved; each change annotated with its ADR; Amendment Register appended.
5. **Amend the Database Specification** — same rules; enum annotations, ownership notes, authorization table, RLS row, retention rule, constants cross-references; Amendment Register appended.
6. **`docs/development/Build-Rules-v1.0.md`** — the governing rules for all future Build Mode work, exactly as listed.
7. **`docs/README.md`** — document map, precedence order, status, change control.

Any further issue discovered mid-consolidation is recorded as a **Deferred Observation** with a reason, not resolved.

## Deliverables on completion

1. Updated document list. 2. Cross-reference validation. 3. Remaining deferred items and deferred observations. 4. Final implementation readiness assessment, with the freeze statement if every blocking documentation issue is closed.
