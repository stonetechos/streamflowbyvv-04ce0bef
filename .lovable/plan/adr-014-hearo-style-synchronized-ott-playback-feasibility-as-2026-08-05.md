# ADR-014 — Hearo-Style Synchronized OTT Playback: Feasibility Assessment

Stop implementation. Produce one honest engineering assessment document that answers whether the intended experience (share from Netflix → auto room → host controls play/pause/seek for everyone) is achievable, and if not, what the closest legal and technical architecture is.

No code. No feature work. One new document plus small status edits to existing records.

## Deliverable

`docs/adr/ADR-014-synchronized-ott-playback-feasibility.md`

## What the ADR will contain

**1. The intended experience, restated precisely**
The 10-step flow you described, written as the acceptance criteria the assessment is measured against — so "achievable" is never ambiguous.

**2. Capability assessment across the 15 mechanisms**
For each of browser/PWA, Android native, iOS native, Android Accessibility Services, MediaSession, share intents, deep links, OTT public SDKs, OTT partner APIs, Cast, AirPlay, DRM, Widevine/FairPlay, app-to-app IPC, and overlays: what it actually grants, what it cannot grant, and the platform-policy risk of relying on it. Explicit verdict per mechanism — usable, usable-with-limits, or unusable.

**3. Provider matrix**
All 15 providers (Netflix, Prime Video, Disney+, JioHotstar, SonyLIV, Zee5, Apple TV+, YouTube, Hulu, HBO Max, Crunchyroll, Peacock, Paramount+, Pluto TV, Tubi) scored on: launch title, deep-link to title, detect playback, control play, control pause, control seek, synchronize, legal restrictions, technical restrictions. Every cell reasoned from the provider's public surface — no optimistic entries.

**4. Why the exact Hearo experience is not reproducible for premium OTT**
The precise chain: no public playback-control API, DRM/secure-surface isolation, ToS clauses forbidding automated control and modification, app sandboxing on iOS with no cross-app IPC, and store-policy exposure for Accessibility-Service-driven control on Android. Named per provider, not generalised.

**5. What the assessment says about StreamFlow's current build**
Where the shipped implementation (share intake, deep-link launch coordinator, countdown, manual sync mode, ADR-003) already sits at the honest ceiling, and where the product story overpromises relative to it.

**6. Closest achievable architecture**
Tiered by what each provider actually permits:
- Tier A — true controlled sync (YouTube IFrame API, local files, Cast-controlled receivers where permitted)
- Tier B — assisted sync (deep link to the exact title + shared clock + host-triggered pause/resume signals that participants act on, with drift correction cues)
- Tier C — coordinated manual sync (current countdown behaviour)
Plus what an Android native build genuinely adds (MediaSession *observation* on some apps, share/intent fidelity) versus what it does not add (control of DRM playback), and what iOS adds (essentially nothing beyond share sheet fidelity).

**7. Decision points requiring your answer**
Whether to pursue OTT partnership conversations, whether to ship a native Android build for observation-only gains, and whether the product positioning changes from "sync" to "watch together".

**8. Recommendation**
A direct answer to "web app or native", with reasoning, and the conditions under which the answer would flip.

## Companion edits

- `docs/adr/ADR-003-sync-mode-per-room.md` — append a note that ADR-014 supersedes its implied provider expectations for premium OTT.
- `mem://features/mvp-scope.md` — record the feasibility ceiling so future sessions never re-propose automated OTT control.

## Not in scope

No source changes, no migrations, no UI edits. If you approve the reframing afterwards, that becomes a separate build plan.
