# Evidence Retention Contract

Implemented by M1.17 to resolve RET-1. It adds no certification row, state, profile or
threshold; it defines only how a run is retained and located.

## Retention model: repository-retained

| Aspect               | Value                                                                              |
| -------------------- | ---------------------------------------------------------------------------------- |
| Destination          | `tests/certification/evidence/<RUN-ID>/` inside the repository working tree        |
| Retention owner      | The repository (version control), not the machine that executed the run            |
| Review path          | `tests/certification/evidence/<RUN-ID>/manifest.json` → `summary.json`             |
| Source-revision bind | Full 40-character commit SHA in the manifest, summary, index and completion marker |
| Failure behaviour    | Fail closed — sealing is refused and the run stays visibly incomplete              |
| Discovery            | `manifest.json` (RUN-ID, work package, engines, rows, revision, artifact digests)  |

The model is **repository-retained and revision-traceable**. It is **not cryptographically
immutable**: SHA-256 digests in the manifest detect tampering, they do not prevent it.
No signing, WORM store or external object storage is introduced.

## What is retained

`records/`, `metrics/`, `reports/`, `screenshots/`, `logs/`, `manifest.json`, `index.json`,
`summary.json` and `completed.json` are version-controlled. Bulk runner output
(`videos/`, `artifacts/`) remains ignored; the manifest still records what a run produced.

## Manifest fields

| Field                             | Classification                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `runId`                           | required by existing authority (Evidence Guide run identity)                                               |
| `sourceRevision.sha`              | required by existing authority (run addressed by commit)                                                   |
| `rows[].evidenceId`               | required by existing authority (`docs/registry/required-evidence.json`)                                    |
| `rows[].engine`                   | required by existing authority (registry `owner`)                                                          |
| `runState`, `counts`              | required by existing authority (result-state vocabulary)                                                   |
| `environmentProfile`, `region`    | required by existing authority                                                                             |
| `artifacts[].sha256`              | required by current implementation (artifact-existence proof)                                              |
| `workPackage`                     | required by current implementation (RET-1 traceability; `CERT_WORK_PACKAGE`)                               |
| `retention.*`                     | required by current implementation (destination proof)                                                     |
| `sourceRevision.workingTreeDirty` | optional hardening — no frozen authority defines a dirty-tree policy; the flag is recorded, never enforced |
| `milestone`                       | optional hardening (`CERT_MILESTONE`)                                                                      |

## Sealing order

1. schema validation, 2. mandatory-evidence validation, 3. retention validation
   (revision, work package, row→engine mapping, artifact digests, destination not ignored),
2. `manifest.json`, 5. `index.json`, 6. `summary.json`, 7. `completed.json` **last**.

A refused seal writes a partial `summary.json` with `sealed: false`, an index with
`complete: false`, removes any completion marker, and exits non-zero.

Runs sealed before this contract existed (`RUN-M0R-001`) are preserved untouched and
reported as having no manifest. They are never rewritten or retro-claimed.

## Validation

`npm run retention:check` (`scripts/check-retention.mjs`) proves R1–R14 of this contract
against throwaway `RUN-RETSELFTEST-*` fixtures that are deleted automatically. It executes
no certification, seals no real run and promotes no row.

## Authoritative destination (M1.18 — DEST-1)

Exactly one evidence destination exists. It is owned by
`scripts/lib/evidence-destination.mjs`; no other module, config or workflow may declare
an evidence root. The value is unchanged from RET-1.

| Item                    | Path                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| Authoritative root      | `tests/certification/evidence/`                                            |
| Per-run path            | `tests/certification/evidence/<RUN-ID>/`                                   |
| RUN-ID path             | the run directory itself; `<RUN-ID>` must be one safe path segment         |
| Work-package lookup     | `<run>/manifest.json` → `workPackage` (also in `summary.json`, `completed.json`) |
| Certification-row map   | `<run>/manifest.json` → `rows[]` → `records/<EVIDENCE-ID>.json`            |
| Manifest                | `<run>/manifest.json`                                                      |
| Index                   | `<run>/index.json`                                                         |
| Summary                 | `<run>/summary.json`                                                       |
| Completion marker       | `<run>/completed.json`                                                     |
| Reports                 | `<run>/reports/`                                                           |
| Metrics                 | `<run>/metrics/`                                                           |
| Logs / screenshots      | `<run>/logs/`, `<run>/screenshots/`                                        |
| Raw runner workspace    | `<run>/artifacts/`, `<run>/videos/`, `<run>/html/`, `<run>/report.json`    |
| Legacy path handling    | `RUN-M0R-001` (pre-manifest) stays at the same root, untouched, no manifest |
| CI relationship         | CI writes to the same root; the uploaded artifact is a derived copy only    |

The raw runner workspace is a **generated temporary workspace** beneath the authoritative
root. It is never authoritative: `videos/` and `artifacts/` stay ignored, and the manifest
lists only `records/`, `metrics/`, `reports/`, `screenshots/`, `logs/`.

### Destination rules

- A RUN-ID must match `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`. Separators, traversal
  sequences and absolute paths are refused before any path is constructed; sealing exits
  non-zero and writes nothing.
- A destination matched by an active ignore rule fails closed (RET-1, unchanged).
- Any evidence root declared anywhere in `scripts/`, `tests/certification/`,
  `playwright.config.ts` or `.github/workflows/` other than the authoritative root fails
  `npm run retention:check` (D1).

### Release-review lookup

Given a RUN-ID: open `tests/certification/evidence/<RUN-ID>/manifest.json`; it carries the
source revision, work package, engines, row→record map and artifact digests, and
`completed.json` proves the run sealed. Given a certification row, work package or source
revision: scan `tests/certification/evidence/*/manifest.json` for the matching
`rows[].evidenceId`, `workPackage` or `sourceRevision.sha` — there is only one root to
scan, so the lookup is deterministic.

`npm run retention:check` proves D1–D8 alongside R1–R14.
