# M1 — Certification Checklist

Status: Planning only. Sprint M1.0. No implementation authorized.

This checklist maps the M1 row set to work packages and required profiles. It does not create, rename, merge, split or delete rows. Definitions are taken from `docs/blueprint/K-launch-certification.md`.

Status vocabulary used here is the authoritative M0.6 set: `pass`, `fail`, `blocked`, `unmeasured`, `unknown`, `not_applicable`. No row below is marked `pass` — none has executed.

---

## In-scope M1 rows (14)

| Row            | Definition (from K)                                                       | Engine      | Platform    | Capability      | Package | Required profiles      | Registry entry today | Current state |
| -------------- | --------------------------------------------------------------------------- | ----------- | ----------- | --------------- | ------- | ---------------------- | -------------------- | ------------- |
| CERT-ROOM-01   | Invite link lands the user in the intended room, including across sign-in  | Room        | web-desktop | n/a             | WP3     | PROF-01, PROF-05       | Absent               | unmeasured    |
| CERT-ROOM-02   | Member appears to all peers with correct identity and role                 | Room        | web-desktop | n/a             | WP4     | PROF-01, PROF-07       | Absent               | unmeasured    |
| CERT-ROOM-03   | 9th joiner is refused with a clear message                                 | Room        | web-desktop | n/a             | WP4     | PROF-07                | Absent               | unmeasured    |
| CERT-ROOM-04   | Rejoin within grace restores room context                                  | Room        | web-desktop | n/a             | WP4     | PROF-04                | Absent               | unmeasured    |
| CERT-PRES-01   | Readiness state is identical for all participants                          | Presence    | web-desktop | n/a             | WP5     | PROF-07                | Absent               | unmeasured    |
| CERT-PRES-02   | Dropped member is marked absent within threshold (≤ 10 s)                  | Presence    | web-desktop | n/a             | WP5     | PROF-04                | Absent               | unmeasured    |
| CERT-WP-01     | All participants reach zero within spread                                  | Watch Party | web-desktop | n/a             | WP6     | PROF-01, PROF-02, PROF-07 | Absent            | unmeasured    |
| CERT-WP-02     | Stages advance identically for host and members                            | Watch Party | web-desktop | n/a             | WP6     | PROF-07                | Absent               | unmeasured    |
| CERT-SYNC-C-01 | Deep link opens, countdown coordinates, no false sync UI                   | Sync        | web-desktop | CAP-OTT-WEBDESK | WP7     | PROF-01                | Absent               | unmeasured    |
| CERT-SYNC-C-02 | As above, on web mobile                                                    | Sync        | web-mobile  | CAP-OTT-WEBMOB  | WP8     | PROF-01                | Absent               | unmeasured    |
| CERT-PROV-01   | Capability tier and consequence stated before commit                       | Provider    | all         | all B rows      | WP9     | PROF-01                | Absent               | unmeasured    |
| CERT-PROV-02   | One-step fallback, announced, reversible                                   | Provider    | web-desktop | all B rows      | WP9     | PROF-01, PROF-04       | Absent               | unmeasured    |
| CERT-EXP-01    | WCAG 2.1 AA on all launch surfaces                                         | Experience  | web-desktop | n/a             | WP10    | PROF-09                | Absent (adjacent `CERT-A11Y-` prefix entry exists) | unmeasured |
| CERT-EXP-02    | Motion respects the OS preference everywhere                               | Experience  | all         | n/a             | WP10    | PROF-09                | Absent               | unmeasured    |

Every M1 row is absent from `docs/registry/required-evidence.json`. Closing that gap is WP2.

---

## Voice dependency items (documented, not scheduled in M1)

| Item          | Current state                                                                                     | Relationship to M1                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| CERT-VOICE-01 | `blocked` in `RUN-M0R-001`; reason names PROF-08                                                    | Listed in the M1 roadmap row set but cannot execute; must not gate the M1 seal as `fail` |
| CERT-VOICE-02 | `blocked` in `RUN-M0R-001`, same cause                                                              | Same                                                                                     |
| PROF-08       | `unsupported` in `tests/certification/profiles/certification-profiles.ts` — no media-server credentials | Root cause for both voice rows                                                         |
| DEBT-005      | `debt-register.json`: PROF-08 / LiveKit blocker, severity High, blocking, milestone **M3**          | Resolution is out of the M1 envelope                                                     |

Identifier conflict: `docs/blueprint/J-technical-debt.md` uses `DEBT-005` for an unrelated ADR-header item at M0. Recorded as discrepancy D-03 in the implementation plan; resolution is WP2-T3.

---

## Rows explicitly not in M1

CERT-WP-03 (M2), CERT-SYNC-C-03/04/05 (native and live, post-launch), CERT-SYNC-A-* and CERT-RT-* (M2), everything requiring PROF-03 (M4).

---

M1 implementation was not performed. M1 remains pending explicit human authorization.
