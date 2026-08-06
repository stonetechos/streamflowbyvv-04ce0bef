# M0 — Provider Capability Baseline

Audit date: 2026-08-06
Authority: [B-capability-matrix.md](../blueprint/B-capability-matrix.md), [ADR-014](../adr/ADR-014-synchronized-ott-playback-feasibility.md)
Governing rule: **no provider may be promoted to Tier A without evidence.**

## The core finding

The Constitution states in [B.4](../blueprint/B-capability-matrix.md) that a provider name never automatically qualifies for a tier, and that Tier A requires the tuple `source · adapter · platform · version` plus a passing certification record.

The implementation does the opposite. `src/domain/providers/provider-tier.ts` resolves tiers from a hardcoded set of provider-name strings:

- Tier A set: `youtube`, `local_file`, `local`, `google_drive`
- Tier B candidate set (gated behind an unset runtime flag): `netflix`, `prime_video`, `disney_plus`, `jiohotstar`, `sonyliv`, `zee5`
- Everything else: Tier C

There is **no platform parameter**, **no adapter reference**, **no version**, and **no certification lookup**. A full-tree search confirms that no `CAP-*` identifier from [B.2](../blueprint/B-capability-matrix.md) appears in any source file, and that no embedded player surface (`<video>`, `iframe`, player SDK) exists anywhere outside `src/components/ui/`.

**Therefore: the four providers currently resolving to Tier A hold that tier without an adapter, without platform discrimination, and without evidence. All four must be recorded below at their evidenced tier, which is C.**

## Catalog scope

`src/features/home/service-shelf.ts` ships **17** provider brands. [B.2](../blueprint/B-capability-matrix.md) defines **11** capability rows. There is no mapping between the two sets, which is itself an outstanding item.

## Provider baseline

Columns: **Code tier** = what `provider-tier.ts` returns today. **Evidenced tier** = the highest tier supportable by artifacts in this repository. Per the governing rule, where these differ, the evidenced tier is authoritative.

| # | Provider key | Brand | Code tier | **Evidenced tier** | Evidence in repository | Limitations | Unknowns | Outstanding verification |
|---|---|---|---|---|---|---|---|---|
| 1 | `youtube` | YouTube | **A** | **C** | Deep-link registry entry only. No IFrame Player API integration, no `embed-player-adapter`. | Cannot start, pause, or seek. No embedded surface exists. | Whether an embedded player is viable within the launch envelope and ToS | Build `embed-player-adapter`; certify CERT-SYNC-A-01 |
| 2 | `local_file` | Your own file | **A** | **C** | No `local-file-adapter`, no `<video>` element, no file-picker path found. | No local playback surface exists at all. | Whether local playback is in the web launch scope | Build `local-file-adapter`; certify CERT-SYNC-A-02 |
| 3 | `local` | (alias of above) | **A** | **C** | Alias key with no distinct catalog entry. | Duplicate key with no owner. | Why the alias exists | Remove or document the alias |
| 4 | `google_drive` | Google Drive | **A** | **C** | No `drive-file-adapter`, no OAuth scope, no Drive API client. | No Drive integration of any kind. | Drive ToS posture for shared playback | Build `drive-file-adapter`; certify CERT-SYNC-A-04 |
| 5 | `netflix` | Netflix | C (B candidate) | **C** | Deep link + `manual-sync-guidance.ts` + provider-session disclosure | Widevine/PlayReady DRM; no sanctioned control API. ADR-014 verdict: control impossible and impermissible. | None material — ADR-014 settles this | Certify CERT-SYNC-C-01 |
| 6 | `prime_video` | Prime Video | C (B candidate) | **C** | As above | As above | — | CERT-SYNC-C-01 |
| 7 | `disney_hotstar` / `disney_plus` | Disney+ | C (B candidate) | **C** | As above. **Key mismatch**: the tier table uses `disney_plus`; the shelf uses `disney_hotstar`. The B-candidate rule therefore never matches the catalog entry. | As above, plus a live key-mismatch defect | Which key is canonical | Reconcile keys; CERT-SYNC-C-01 |
| 8 | `jiohotstar` | JioHotstar | C (B candidate) | **C** | As above | As above | — | CERT-SYNC-C-01 |
| 9 | `sonyliv` | SonyLIV | C (B candidate) | **C** | As above | As above | — | CERT-SYNC-C-01 |
| 10 | `zee5` | ZEE5 | C (B candidate) | **C** | As above | As above | — | CERT-SYNC-C-01 |
| 11 | `apple_tv_plus` | Apple TV+ | C | **C** | Deep link + guidance | FairPlay DRM; strongest platform sandboxing of the set | Deep-link reliability on non-Apple platforms | CERT-SYNC-C-01 |
| 12 | `crunchyroll` | Crunchyroll | C | **C** | Deep link + guidance | DRM; no control surface | — | CERT-SYNC-C-01 |
| 13 | `hbo_max` | HBO Max | C | **C** | Deep link + guidance | DRM; regional availability varies | Deep-link scheme stability after rebrands | CERT-SYNC-C-01 |
| 14 | `hulu` | Hulu | C | **C** | Deep link + guidance | DRM; US-only | — | CERT-SYNC-C-01 |
| 15 | `peacock` | Peacock | C | **C** | Deep link + guidance | DRM; regional | — | CERT-SYNC-C-01 |
| 16 | `paramount_plus` | Paramount+ | C | **C** | Deep link + guidance | DRM; regional | — | CERT-SYNC-C-01 |
| 17 | `tubi` | Tubi | C | **C** | Deep link + guidance | Ad-supported; ad breaks desynchronise participants unpredictably | Whether ad-break drift is bounded | Measure Tier C drift under ads |
| 18 | `pluto_tv` | Pluto TV | C | **C** | Deep link + guidance | Linear/live channels; position has no shared meaning | Whether linear content should be modelled as CAP-LIVE-ANY | Map to CAP-LIVE-ANY; CERT-SYNC-C-05 |

**Evidenced tier distribution: Tier A = 0. Tier B = 0. Tier C = 18 (17 brands + 1 alias).**

## Tier B status

Tier B requires `hasMediaSessionObservation === true`, which no runtime in this repository sets. The six Tier B candidates therefore always resolve to Tier C in practice. This is **safe** — the system does not overclaim at runtime — but it means:

- Tier B is unreachable dead code today.
- CERT-SYNC-B-01 (web-mobile) and CERT-SYNC-B-02 (android) cannot be evidenced.
- The Constitution's Tier B rows in [B.2](../blueprint/B-capability-matrix.md) describe an intent, not an implementation.

## What the implementation gets right

This section matters as much as the finding above. Against ADR-014's ceiling, the shipped behaviour is honest:

1. **No control affordance is presented for any OTT provider.** The UI does not offer play, pause, or seek for content it cannot control.
2. **`manual-sync-guidance.ts` states the consequence plainly** before the room commits to a provider — the substance of what CERT-PROV-01 asks for.
3. **`catch-up-sheet.tsx` gives advisory guidance**, never a control command. Drift is reported to the human, who acts.
4. **No prohibited mechanism appears anywhere in the tree** — no accessibility-service automation, no overlay automation, no screen capture, no Cast/AirPlay control, no scraping. `CAP-CAPTURE-ANY` and `CAP-A11Y-ANDROID` are excluded in the Constitution and are correspondingly absent from the code.
5. **Provider sessions disclose connection status** rather than implying entitlement StreamFlow does not have.

The product is compliant. The **classification layer** is not.

## Required actions

| ID | Action | Milestone | Blocking |
|---|---|---|---|
| PROV-A1 | Stop returning Tier `"a"` from `provider-tier.ts` until an adapter and a passing CERT row exist. Four providers demote to their evidenced tier, C. | M0 | **Yes** |
| PROV-A2 | Reconcile the `disney_plus` / `disney_hotstar` key mismatch | M1 | No |
| PROV-A3 | Introduce a capability registry keyed `CAP-<source>-<platform>` carrying adapter, version, and certification reference | M1 | Yes (for any future Tier A claim) |
| PROV-A4 | Map all 17 shelf brands to the 11 capability rows; document unmapped brands | M1 | No |
| PROV-A5 | Remove or document the `local` alias | M1 | No |
| PROV-A6 | Model Pluto TV and other linear content as `CAP-LIVE-ANY` | M2 | No |
| PROV-A7 | Measure Tier C coordination drift on ad-supported providers | M2 | No |

## Statement of record

> As of 2026-08-06, **StreamFlow supports zero Tier A capabilities and zero Tier B capabilities.** Every provider in the catalog operates at Tier C: deep link, countdown, and voice, with participants pressing play themselves. This is consistent with ADR-014 and is the honest description of the product as built.
