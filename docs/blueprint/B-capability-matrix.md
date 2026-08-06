# B — Capability Matrix

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

## B.1 How to read this document

Capabilities are keyed by the tuple `source · adapter · platform · version`. **Provider names are labels, not tiers.** A row's tier applies only to that exact tuple. The same provider appearing on two platforms produces two rows, and those rows may hold different tiers.

Tier definitions are normative in [A.3](./A-product-operating-brief.md#a3-sync-tier-model--capability-based-never-provider-based):

- **Tier A** — verified controllable playback; requires a passing certification record in [K](./K-launch-certification.md).
- **Tier B** — observable, not controllable.
- **Tier C** — deep link + countdown + voice + coordinated manual playback.

**Tier A gate.** A row may only be published as Tier A when column _Certification Record_ names a row in K that is passing and not expired. A Tier A row without a certification record is a documentation defect and the runtime must treat the capability as Tier C.

## B.2 Column definitions

| Column               | Meaning                                                   |
| -------------------- | --------------------------------------------------------- |
| Capability ID        | Stable identifier, `CAP-<source>-<platform>`              |
| Source               | Content origin category                                   |
| Adapter              | StreamFlow adapter module responsible                     |
| Platform             | web-desktop, web-mobile, android, ios, tv, desktop        |
| Min version          | Minimum verified adapter + runtime version                |
| Tier                 | A / B / C for this tuple only                             |
| Certification Record | Row ID in K, or `—`                                       |
| Host/member limits   | Any deviation from the 2–8 envelope                       |
| Fallback             | Tier the runtime degrades to on failure                   |
| Launch status        | launch / post-launch / investigating / excluded           |
| Disclosure text key  | Localization key for the user-facing capability statement |

## B.3 Capability rows

| Capability ID     | Source                           | Adapter                | Platform    | Min version | Tier | Certification Record | Limits | Fallback | Launch status | Disclosure key                |
| ----------------- | -------------------------------- | ---------------------- | ----------- | ----------- | ---- | -------------------- | ------ | -------- | ------------- | ----------------------------- |
| CAP-EMBED-WEBDESK | Embeddable public player surface | `embed-player-adapter` | web-desktop | 1.0         | A    | CERT-SYNC-A-01       | 2–8    | C        | launch        | `capability.embed.controlled` |
| CAP-EMBED-WEBMOB  | Embeddable public player surface | `embed-player-adapter` | web-mobile  | 1.0         | B    | CERT-SYNC-B-01       | 2–8    | C        | launch        | `capability.embed.assisted`   |
| CAP-EMBED-ANDROID | Embeddable public player surface | `embed-player-adapter` | android     | 1.0         | B    | CERT-SYNC-B-02       | 2–8    | C        | post-launch   | `capability.embed.assisted`   |
| CAP-EMBED-IOS     | Embeddable public player surface | `embed-player-adapter` | ios         | —           | C    | —                    | 2–8    | C        | investigating | `capability.embed.manual`     |
| CAP-LOCAL-WEBDESK | User-supplied local file         | `local-file-adapter`   | web-desktop | 1.0         | A    | CERT-SYNC-A-02       | 2–8    | C        | launch        | `capability.local.controlled` |
| CAP-LOCAL-WEBMOB  | User-supplied local file         | `local-file-adapter`   | web-mobile  | 1.0         | A    | CERT-SYNC-A-03       | 2–8    | C        | post-launch   | `capability.local.controlled` |
| CAP-LOCAL-ANDROID | User-supplied local file         | `local-file-adapter`   | android     | —           | C    | —                    | 2–8    | C        | post-launch   | `capability.local.manual`     |
| CAP-DRIVE-WEBDESK | User's own cloud-drive file      | `drive-file-adapter`   | web-desktop | 1.0         | A    | CERT-SYNC-A-04       | 2–8    | C        | post-launch   | `capability.drive.controlled` |
| CAP-OTT-WEBDESK   | Premium OTT provider app/site    | `deep-link-adapter`    | web-desktop | 1.0         | C    | CERT-SYNC-C-01       | 2–8    | C        | launch        | `capability.ott.manual`       |
| CAP-OTT-WEBMOB    | Premium OTT provider app/site    | `deep-link-adapter`    | web-mobile  | 1.0         | C    | CERT-SYNC-C-02       | 2–8    | C        | launch        | `capability.ott.manual`       |
| CAP-OTT-ANDROID   | Premium OTT provider app         | `deep-link-adapter`    | android     | 1.0         | C    | CERT-SYNC-C-03       | 2–8    | C        | post-launch   | `capability.ott.manual`       |
| CAP-OTT-IOS       | Premium OTT provider app         | `deep-link-adapter`    | ios         | 1.0         | C    | CERT-SYNC-C-04       | 2–8    | C        | post-launch   | `capability.ott.manual`       |
| CAP-LIVE-ANY      | Live broadcast / linear event    | `deep-link-adapter`    | all         | 1.0         | C    | CERT-SYNC-C-05       | 2–8    | C        | post-launch   | `capability.live.manual`      |
| CAP-CAPTURE-ANY   | Screen capture of any source     | —                      | all         | —           | —    | —                    | —      | —        | excluded      | —                             |
| CAP-A11Y-ANDROID  | Accessibility-service automation | —                      | android     | —           | —    | —                    | —      | —        | excluded      | —                             |

`excluded` rows are recorded deliberately so future proposals are answered by the document rather than re-litigated. Both exclusions are mandated by ADR-014 and Product Principle P8.

## B.4 Provider-name shorthand is prohibited

Statements of the form "Provider X is Tier A" are removed from every chapter of this constitution and must not be reintroduced in code comments, UI copy, marketing, or ADRs. The permitted form is:

> `CAP-<id>` is Tier A on `<platform>` at adapter version `<v>`, certified by `CERT-<id>` on `<date>`.

## B.5 Fallback behaviour

| From | Trigger                                                     | To           | User-visible behaviour                         |
| ---- | ----------------------------------------------------------- | ------------ | ---------------------------------------------- |
| A    | Control call fails or adapter unresponsive beyond threshold | B            | Banner: control lost, position still tracked   |
| A    | Observation also lost                                       | C            | Banner: manual mode, catch-up guidance offered |
| B    | Observation lost                                            | C            | Banner: manual mode, catch-up guidance offered |
| C    | Deep link unresolvable                                      | C (degraded) | Copyable link plus manual instructions         |

Fallback is always one step at a time, always announced (P7), and always reversible when the capability recovers.

## B.6 Adding or changing a capability

1. Add or amend the row here with tier `C` and launch status `investigating`.
2. Add the corresponding certification row(s) in K with the applicable certification profiles.
3. Run certification. Only a passing record may raise the tier.
4. Record the change in a numbered ADR listing Affected Engines and Affected Milestones per [I — Governance](./I-governance.md).
