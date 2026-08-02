# Build Rules v1.0 — StreamFlow by Vedora Vision

**Status:** Frozen (v1.0). Governing document for every future Build Mode prompt.
**Authority:** Subordinate to the Foundation Specification v1.0, which remains the tie-breaker on architecture. These rules govern *how* implementation happens, not *what* the product is.
**Change control:** Amended only by a numbered ADR in `docs/adr/`.

---

## 1. Scope discipline

1. **Implement only the requested scope.** Nothing adjacent, nothing anticipatory, nothing "while we're here".
2. **Stop immediately after the requested scope is complete.** Completion is a stopping point, not a springboard.
3. **Never invent new features.** A capability that is not in an approved document does not exist.
4. **Never refactor unrelated files.** A file is touched only if the requested scope requires it.
5. **Never rename folders, modules, or files without explicit approval.**
6. **Report blockers instead of inventing solutions.** An ambiguity is escalated, not resolved by guesswork.

---

## 2. Specification discipline

7. **Never modify frozen specifications.** The Foundation Spec, ADR-001 through ADR-013, the MVP Functional Specification, and the Database Specification are read-only.
8. **Never redesign architecture unless explicitly requested**, and then only through a new numbered ADR.
9. **Every implementation must remain traceable back to an approved specification section.** If it cannot be traced, it does not ship.
10. **Constants come from Foundation §14.** No duration, threshold, expiry, or retention value is invented, hard-coded twice, or quietly changed.
11. **Errors and strings come from Foundation §16.** Every user-facing string is a localization key from the first commit; every failure carries an error code.

---

## 3. Database discipline

12. **Never change the database schema without an approved ADR.** No table, column, enum value, index, or policy ships without appearing in the Database Specification first.
13. **Migrations are forward-only and immutable once merged.** Corrections ship as new migrations.
14. **Every new public-schema table ships with its grants and its RLS policies in the same migration.**
15. **Roles are never a column on a profile.** Authorization is read from the roles table through the security-definer function (ADR-009).
16. **Enum values are mirrored between application constants and check constraints**, verified on every enum-touching migration.

---

## 4. Architecture discipline

17. **Respect Clean Architecture boundaries at all times:** Presentation → Feature → Domain → Repository → Infrastructure, one direction only, no layer skipping.
18. **No vendor type crosses the Repository boundary.** Domain code never imports a Supabase, LiveKit, or AI provider type.
19. **Every provider-touching path calls ComplianceService.** There is no second path, no fast path, and no exception for internal tooling.
20. **Po gains capabilities only by registering a tool.** Po Core is never modified to add a capability.
21. **One module at a time**, following Architecture → Review → Freeze → Build One Module. Each module ships with its contract, domain events, error taxonomy, localization keys, feature flag, accessibility behaviour, and analytics events — never as follow-ups.

---

## 5. Portability discipline

22. **Preserve complete portability** to Cursor, Claude Code, VS Code, Windsurf, Emergent, and standard React environments. The project must build and run with a plain package manager and a plain dev server.
23. **Never introduce hidden platform dependencies.** No Lovable-specific import, config, directory convention, or runtime assumption in application architecture.
24. **Keep Supabase portable and repository-driven.** Migrations live in the repository, schema is generated from the Database Specification, and coupling to the auth provider stays confined to `profiles.auth_user_id`.
25. **Vendor swaps must remain single-adapter changes:** database, realtime transport, voice SFU, AI provider, and object storage each sit behind exactly one interface.

---

## 6. Change discipline

26. **Keep commits small, modular, and reversible.** One concern per commit, each independently revertable.
27. **No commit mixes a refactor with a behaviour change.**
28. **No dead code, no commented-out alternatives, no speculative abstractions.**
29. **Secrets never enter the repository, the database, or the client bundle.**
30. **When implementation reveals a genuine architectural gap, stop and raise a new ADR.** Do not patch the gap silently, and do not create planning documents proactively.

---

*These rules apply to every Build Mode prompt from Documentation v1.0 freeze onward.*
