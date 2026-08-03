## Git Discipline v1.0 — Memory Update Plan

### Goal

Formalize the Git Discipline rules as a project-level constraint that amends the current Build Rules v1.0 change discipline without modifying the frozen `Build-Rules-v1.0.md` document.

### Scope

- Create `mem://constraints/git-discipline.md` with the six rules and their reconciliation with Build Rules §6.
- Update `mem://index.md` to reference the new constraint.
- No changes to `docs/development/Build-Rules-v1.0.md` and no new ADR, per the "Memory only" change-control requirement.

### Reconciliation with Build Rules v1.0 §26

The frozen Build Rules v1.0 rule 26 says: _"Keep commits small, modular, and reversible. One concern per commit, each independently revertable."_
Git Discipline v1.0 reconciles this as:

- During a sprint: keep local branch commits small, modular, and reversible (one concern per commit).
- At the sprint boundary: squash the local branch into one public commit per sprint.
- Never rewrite the history of a completed sprint.
- Never modify the scope of a completed sprint unless fixing a defect.
- Keep the repository portable to standard Git tooling.
- Never depend on Lovable-only Git features.

### Memory file content

`mem://constraints/git-discipline.md`:

```text
---
name: Git Discipline v1.0
description: Amends Build Rules v1.0 §6 by requiring one public commit per sprint while keeping local commits small, modular, and reversible; prohibits rewriting completed sprint history and Lovable-only Git features.
type: constraint
---
Git Discipline v1.0 — StreamFlow by Vedora Vision

- Commit only when the sprint is complete.
- One sprint = one public commit.
- Local commits during a sprint must remain small, modular, and reversible (one concern per commit).
- Never rewrite previous sprint history.
- Never modify completed sprint scope unless fixing a defect.
- Keep the repository portable to standard Git tooling.
- Never depend on Lovable-only Git features.

Note: This memory constraint conceptually amends Build Rules v1.0 §6. Because Build Rules v1.0 is frozen and change-controlled only via ADR, and per project decision this change is stored in memory only, the source file `docs/development/Build-Rules-v1.0.md` remains unchanged.
```

### Index update

Add to `mem://index.md` under **Memories**:

```text
- [Git Discipline v1.0](mem://constraints/git-discipline.md) — Amends Build Rules v1.0 §6; one public commit per sprint, local commits stay small and reversible.
```

### Outcome

After approval, the constraint will be part of the automatically-applied project memory. Every future Build Mode sprint will be committed as one public commit at the sprint boundary, while local work remains small and reversible. The frozen documentation set is not touched.
