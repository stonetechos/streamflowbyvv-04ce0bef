# M1 — Dependency Graph

Status: Planning only. Sprint M1.0. No implementation authorized.

---

## Package dependencies

```text
                    WP1 Harness extension  (Needs discovery)
                     |        |        |        |        |
        +------------+        |        |        |        +-------------+
        |                     |        |        |                      |
      WP3 Invite            WP5      WP6      WP7 Tier C             WP10 Experience
      resolution            Presence Watch    coordination           (a11y, motion)
        |                              Party      |
      WP4 Join / capacity                |        |
      leave / rejoin                     |        +--> WP8 Web-mobile surface
        |                                |             (Needs discovery)
        +--------------+-----------------+
                       |
                     WP9 Provider disclosure and fallback
                       |
                     WP2 Registry and checklist wiring
                       |
                  M1 seal + human gate
```

**Edges explained**

| From     | To       | Nature | Why                                                                                       |
| -------- | -------- | ------ | ----------------------------------------------------------------------------------------- |
| WP1      | WP3–WP10 | Hard   | No row can produce evidence until its spec and evidence writer exist                      |
| WP3      | WP4      | Hard   | Join, capacity and rejoin all assume a resolved invite                                    |
| WP1      | WP8      | Hard   | The mobile surface needs the same fixtures plus a harness project that does not yet exist |
| WP6      | WP7      | Soft   | Tier C coordination is observed through the countdown the watch party drives              |
| WP3–WP10 | WP2      | Hard   | The registry should be tightened only once every row can actually emit a record           |
| WP2      | Seal     | Hard   | `gates:check` must be able to refuse an incomplete M1 run before a seal is trusted        |

---

## Critical path

```text
WP1 -> WP3 -> WP4 -> WP9 -> WP2 -> seal + human gate
```

WP1 is the single longest-lead item and gates everything. WP8 is a parallel risk branch that can fall off the critical path only if the web-mobile row is formally deferred by ADR.

---

## Parallelizable tracks

| Track | Packages | Can start once           | Notes                                                     |
| ----- | -------- | ------------------------ | --------------------------------------------------------- |
| A     | WP3, WP4 | WP1-T3 fixture lands     | Room engine, sequential internally                        |
| B     | WP5, WP6 | WP1-T4 instrumentation   | Presence and watch party share the multi-client fixture   |
| C     | WP7, WP8 | WP1-T5 evidence writers  | WP8 may block on a harness-project decision               |
| D     | WP9      | WP1-T5                   | Provider disclosure is UI-assertion heavy, low coupling   |
| E     | WP10     | Immediately after WP1-T2 | Extends an existing spec, lowest coupling of all packages |

Tracks A–E can run concurrently once WP1 completes. WP2 is the convergence point and must run last.

---

## Off-graph items

- **CERT-VOICE-01/02** are not on the graph. They are blocked by PROF-08 (DEBT-005) and scheduled at M3.
- **CERT-WP-03** is an M2 row.
- **PROF-03 work** is deferred to M4 (DEBT-006).

---

M1 implementation was not performed. M1 remains pending explicit human authorization.
