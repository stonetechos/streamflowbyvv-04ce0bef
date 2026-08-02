# StreamFlow by Vedora Vision — Documentation Index

**Status:** Documentation v1.0 — **frozen**.
No further planning documents are to be created proactively. Any change from this point requires a new numbered ADR raised by a genuine issue discovered during implementation.

---

## 1. Precedence order

When two documents disagree, the higher entry wins.

1. Approved ADRs (`docs/adr/`), most recent numbered decision on a given topic first
2. Foundation Specification v1.0
3. Database Specification v1.0
4. MVP Functional Specification v1.0
5. Contract documents (`docs/api/`, `docs/foundation/storage-design-v1.0.md`)
6. Audit and reconciliation reports (historical record, non-normative)

Build Rules v1.0 governs *how* implementation proceeds and is not in conflict with any of the above.

---

## 2. Document set

### Foundation
| Document | Path | Role |
|---|---|---|
| Foundation Specification v1.0 | `foundation/Foundation-Specification-v1.0.md` | Architecture constitution: layers, domain services, event bus, provider SDK, feature flags, local-first, system constants (§14), clock sync (§15), error taxonomy (§16), localization (§17), cache (§18), rate limits (§19) |
| Storage Design v1.0 | `foundation/storage-design-v1.0.md` | Buckets, path grammar, access rules, lifecycle |

### Product
| Document | Path | Role |
|---|---|---|
| MVP Functional Specification v1.0 | `product/MVP-Functional-Specification-v1.0.md` | v1.0 scope, journeys, provider matrix, settings, errors, accessibility, analytics, non-goals |

### Data
| Document | Path | Role |
|---|---|---|
| Database Specification v1.0 | `database/Database-Specification-v1.0.md` | Entities, codes, enums, relationships, auditing, RLS intent, extensibility |

### Contracts
| Document | Path | Role |
|---|---|---|
| Domain Event Catalog v1.0 | `api/domain-event-catalog-v1.0.md` | Event envelope and every v1.0 event payload |
| Po Tool Registry | `api/po-tool-registry.md` | Tool contracts, inputs, outputs, compliance and confirmation gates |

### Decisions
| ADR | Topic |
|---|---|
| ADR-001 | Po intent-driven AI agent architecture |
| ADR-002 | Room lifecycle label → `room_status` mapping |
| ADR-003 | Sync mode is a room property |
| ADR-004 | Status read ownership (lifecycle vs. playback) |
| ADR-005 | Preference field ownership |
| ADR-006 | Email invite model |
| ADR-007 | Notification transport vs. presentation |
| ADR-008 | Po clarification precedence |
| ADR-009 | Authorization via `user_roles` |
| ADR-010 | Guest preview scope |
| ADR-011 | Blocking during an active room |
| ADR-012 | Retention invariant |
| ADR-013 | Room capacity: domain policy vs. schema envelope |

### Governance
| Document | Path | Role |
|---|---|---|
| Build Rules v1.0 | `development/Build-Rules-v1.0.md` | Mandatory rules for every future Build Mode task |

### Historical (non-normative)
- `audit/Architecture-Alignment-Report-v1.0.md`
- `audit/Specification-Reconciliation-Report-v1.0.md`

---

## 3. System constants (normative source: Foundation §14)

| Constant | Value |
|---|---|
| Default countdown | 5 s |
| Countdown range | 3–60 s |
| Invite expiry | 24 h |
| Join link expiry | 24 h |
| Room inactivity timeout | 30 min |
| Recent room retention | 30 days |
| Domain event retention | 24 months |
| Projection retention | 90 days |
| Po session retention | 30 days |
| Analytics retention | 12 months |
| Sync Excellent / Good / Warning / Re-sync | ≤100 / 101–250 / 251–500 / >500 ms |
| Launch locales | `en`, `hi-IN` |

---

## 4. Working rule

Read Build Rules v1.0 before any implementation task. Every change must trace back to a section of a document listed above.
