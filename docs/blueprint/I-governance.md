# I — Governance

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

## I.1 Constitutional authority

This constitution is frozen at **v2.0.0**. From this version onward, **no architectural change may occur except through a numbered ADR** in `docs/adr/`. Editing a chapter without an accompanying Accepted ADR is a governance violation and must be reverted.

Precedence, highest first:

1. Legal and compliance constraints (ADR-014, P8).
2. Accepted ADRs, most recent superseding older ones.
3. This constitution.
4. Foundation Spec v1.0, MVP Functional Spec v1.0, Database Spec v1.0 (frozen).
5. Implementation.

## I.2 ADR lifecycle

Every ADR occupies exactly one state:

| State | Meaning | Entry condition | Exit |
|---|---|---|---|
| **Draft** | Proposed, under review, not binding | Authored and numbered | Accepted or withdrawn |
| **Accepted** | Binding on implementation and certification | Review complete and approved | Superseded or Deprecated |
| **Superseded** | Replaced by a later ADR that covers the same decision | A later ADR names it in *Supersedes* | Terminal |
| **Deprecated** | No longer applicable; not replaced | The decision's subject no longer exists | Terminal |

Transition rules:

- Draft → Accepted requires review sign-off and, if it changes a capability tier or a Certified Threshold, a corresponding certification plan.
- Accepted → Superseded happens only by another ADR explicitly naming it; an ADR cannot supersede itself.
- Accepted → Deprecated requires a stated reason and a note on any chapter that cited it.
- Superseded and Deprecated ADRs are never deleted or edited. History is immutable.

## I.3 Mandatory ADR header

Every ADR — new or amended — records:

```text
ADR-<NNN>: <title>
Status:            Draft | Accepted | Superseded | Deprecated
Date:              YYYY-MM-DD
Dependencies:      ADR-xxx, ADR-yyy   (ADRs this one relies on)
Supersedes:        ADR-zzz | none
Superseded by:     ADR-www | none
Affected Engines:  <domain engines and/or Experience Engine>
Affected Milestones: <M0..M7>
Constitution impact: <chapters amended, or none>
```

An ADR missing any of these fields cannot leave Draft.

## I.4 Constitution versioning

- **Major** — a change to layering, the engine model, the tier model, or the Launch Envelope.
- **Minor** — a new chapter, a new engine, a new capability tier row, a new certification profile.
- **Patch** — clarification with no behavioural consequence.

Each version bump is authored by the ADR that causes it and lists the amended chapters. The version in `StreamFlow-Blueprint.md` is authoritative.

## I.5 Naming conventions

| Artifact | Convention |
|---|---|
| Database identifiers | `snake_case`, plural tables |
| Human-readable codes | `PREFIX-000001` (ROM-, USR-, INV-) |
| Domain events | `engine.past_tense_fact` |
| Capability IDs | `CAP-<SOURCE>-<PLATFORM>` |
| Certification rows | `CERT-<ENGINE>-<NN>` |
| ADRs | `ADR-<NNN>-<kebab-title>.md` |
| Modules | kebab-case files, one concern per file |

## I.6 Ownership

Each engine has a named owner accountable for its contracts, its events, its certification rows, and its debt entries. The Experience Engine has a single owner accountable for accessibility conformance across all surfaces.

## I.7 Public contract rules

- Contracts are vendor-neutral and expressed in domain terms.
- Breaking a contract requires an ADR plus a deprecation window.
- Every contract change updates the engine's section in [C](./C-engine-pack.md) in the same change.

## I.8 Event versioning

- Events are additive by default; new optional fields need no version bump.
- A removed or retyped field requires `engine.fact.v2` alongside `v1`.
- Two versions may coexist for at most one milestone; the older is then deprecated by ADR.
- Consumers must ignore unknown fields.

## I.9 Backward compatibility and deprecation

1. Announce in an ADR with a target milestone.
2. Ship the replacement alongside the old path.
3. Instrument usage of the old path.
4. Remove only after the certification suite passes without it.

## I.10 Feature flag policy

- Every flag records owner, purpose, default, and removal milestone.
- Flags are not permanent configuration; a flag outliving its removal milestone becomes a debt entry in [J](./J-technical-debt.md).
- Certification runs against the launch flag configuration; any other configuration is uncertified.

## I.11 Documentation standards

- The constitution is the single source of architectural truth; conflicting docs are defects.
- A capability claim without a certification record is a documentation defect.
- Provider-name shorthand for tiers is prohibited (see [B.4](./B-capability-matrix.md#b4-provider-name-shorthand-is-prohibited)).
- The still-missing Foundation Spec v1.0 file remains an open documentation debt and is tracked in [J](./J-technical-debt.md).

## I.12 Change checklist

Before any architectural change merges:

- [ ] Numbered ADR exists with a complete header (I.3)
- [ ] Affected Engines and Affected Milestones listed
- [ ] Chapters amended and constitution version bumped
- [ ] Certification rows added or updated in [K](./K-launch-certification.md)
- [ ] Performance impact assessed against [C4](./C4-performance-budget.md)
- [ ] No product principle in [C5](./C5-product-principles.md) violated
- [ ] Launch Envelope respected or explicitly extended by the same ADR
