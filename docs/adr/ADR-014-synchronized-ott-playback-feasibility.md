# ADR-014 — Hearo-Style Synchronized OTT Playback: Feasibility Assessment

**Status:** Accepted. **Date:** 2026-08-05.
**Type:** Engineering feasibility assessment + architecture decision.
**Supersedes provider expectations implied by:** ADR-003 §Decision, MVP Spec §7 (Provider Matrix).
**Does not modify:** Foundation Specification v1.0.

---

## 0. Summary verdict

The requested experience — share a Netflix title into StreamFlow, have friends land on the same title, and have the host's play/pause/seek propagate to everyone's playback — **is not achievable on any of the fifteen premium OTT providers we list, on any platform, by any technical route that is both legal and store-distributable.**

It is achievable on exactly three surfaces: **YouTube**, **local files**, and **Pluto TV / Tubi where an embeddable or HLS-accessible player is exposed and terms permit** (unverified; see §4). Everything else caps out at _coordinate people, not players_.

Hearo does not do what the flow above describes either. Hearo's synchronized playback is real only for its own player surfaces and for audio it can host; for Netflix, Prime, Disney+ and similar it degrades to exactly the deep-link + shared-clock + voice model StreamFlow already ships. The gap between StreamFlow and Hearo is **not synchronization capability — it is presentation, latency of the hand-off, and the feeling of automaticity.** That gap is closable. The control gap is not.

Recommendation in one line: **stay web-first (PWA), add an Android native shell for share fidelity and playback _observation_, do not build iOS native for this reason, and reposition the product from "we sync your Netflix" to "we keep you in sync while you watch."** Full reasoning in §8.

---

## 1. The intended experience, as acceptance criteria

The assessment is measured against these, verbatim:

| #   | Step                                                                   | Acceptance criterion                                         |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| A1  | Host shares a title from the OTT app                                   | StreamFlow receives a payload identifying the exact title    |
| A2  | StreamFlow extracts provider, title, season, episode, runtime, artwork | All six fields resolved without the host typing              |
| A3  | Room created automatically                                             | Zero additional host steps                                   |
| A4  | Friends join                                                           | Existing capability                                          |
| A5  | Friends taken **directly to the same content**                         | Guest's provider app opens on the same title, playback-ready |
| A6  | Host presses Play → everyone plays                                     | Guest playback _starts_ without guest action                 |
| A7  | Host Pause → everyone pauses                                           | Guest playback _stops_ without guest action                  |
| A8  | Host Seek → everyone seeks                                             | Guest position _changes_ without guest action                |
| A9  | Host Resume → everyone resumes                                         | As A6                                                        |
| A10 | Voice remains active throughout                                        | Existing capability                                          |

A1, A3, A4, A10 are **met today**. A2 is **partially met** (see §5). A5 is **met for some providers, degraded for others**. **A6–A9 are the failure set**, and they are the entire "sync" claim.

---

## 2. Capability assessment — the fifteen mechanisms

Verdicts: **Usable** / **Limited** / **Unusable**.

### 2.1 Browser (PWA) — **Limited**

Grants: share-target intake, deep-link launch into a new tab or the provider app via URL, shared server clock, voice, presence, drift cues.
Cannot grant: any observation or control of a third-party origin. Cross-origin iframes are opaque; `postMessage` requires the provider to implement a listener (only YouTube does). Netflix, Disney+ and peers set `X-Frame-Options`/CSP frame-ancestors that forbid embedding outright. Widevine L1/L3 playback in an embedded context is refused by the CDM for unlicensed origins.
Policy risk: none — we do nothing prohibited.

### 2.2 Android native — **Limited**

Grants: high-fidelity `ACTION_SEND` intake including EXTRA_TEXT/EXTRA_STREAM, reliable `Intent`-based launch into the provider app on the exact title, foreground service for a persistent voice/sync bar, and — critically — **`MediaSessionManager.getActiveSessions()` observation** (see 2.5).
Cannot grant: control of another app's DRM playback surface. Android's app sandbox has no general IPC into a foreign process, and DRM playback runs on a `SECURE` surface owned by that process.
Policy risk: low for share/launch/observation; high for the mechanisms in 2.4 and 2.15.

### 2.3 iOS native — **Unusable for control, marginal for everything else**

Grants over PWA: share-extension fidelity, universal-link handling, background audio for voice.
Cannot grant: any cross-app observation or control. iOS has no equivalent of `MediaSessionManager`; `MPNowPlayingInfoCenter` exposes _your own_ app's now-playing, not another app's. There is no accessibility-service analogue available to third-party apps. App-to-app communication is limited to URL schemes and `UIActivity` — one-way, launch-only, no callback.
**An iOS native build adds essentially nothing to the sync problem.** This is the clearest finding in this document.

### 2.4 Android Accessibility Services — **Unusable (viable technically, prohibited in practice)**

Technically: an accessibility service can read the view hierarchy of a foreground app and dispatch gestures, so it _could_ tap Netflix's pause button and drag its scrubber.
Why it is off the table:

- **Google Play policy** restricts `AccessibilityService` to apps whose core purpose is assisting users with disabilities. Using it to automate a media app is a documented rejection/removal category. There is no declaration form that permits it.
- It is **automated control of a third-party service**, which every premium OTT ToS in §3 explicitly prohibits (see §4.2 clause family).
- It is brittle: any Netflix UI update breaks it; scrubbing by gesture cannot achieve frame-accurate seek; DRM surfaces render as opaque nodes with no position readout, so you can _poke_ playback but never _know_ playback.
  So even ignoring policy and legality, it cannot deliver A8 accurately, and cannot deliver the closed loop A6–A9 depends on.

### 2.5 Android MediaSession APIs — **Limited, and the single most valuable native-only capability**

`MediaSessionManager.getActiveSessions()` (requires the Notification Listener permission, granted by the user in system settings) exposes, for apps that publish a session: playback state (playing/paused), position, duration, and metadata (title, artist/series, artwork).
What it gives us: **playback detection** — A6–A9 _observed on the host_, which is enough to drive "the host just paused" as a **signal** the guests act on. That converts our blind countdown into a live, honest, host-mirrored state.
What it does not give us: control of another app. `MediaController.getTransportControls()` can send commands, but only when the session's owner accepts external controllers; premium OTT apps either publish no session, publish a read-only session, or reject foreign controllers. Some (notably Netflix) publish minimal or no session while casting/DRM playback is active.
Coverage is provider-dependent and version-dependent; assume it works nowhere until measured per app.
Policy risk: Notification Listener access requires prominent disclosure but is permitted for legitimate purposes. Read-only use is defensible; issuing transport commands to a foreign OTT session is not, per §4.2.

### 2.6 Share Intents — **Usable**

Android `ACTION_SEND`, iOS Share Extension, Web Share Target. All fifteen providers expose a share action for a title. This is the foundation of A1 and it works. What arrives is a public URL plus, sometimes, a title string — never structured metadata.

### 2.7 Deep Links — **Usable for launch, Limited for "playback-ready"**

Every provider honours a title URL. What differs is whether the link lands on a **detail page** (user must press play) or **directly in the player**. Detail-page landings break the illusion of A5 by one tap. No provider guarantees player-direct entry for third-party links, and several deliberately route through the detail page for entitlement and profile-selection reasons.
Profile selection is the other breaker: Netflix, Prime, Disney+ and Hotstar frequently interpose a "who's watching" screen, which no link can skip.

### 2.8 OTT public SDKs — **Unusable except YouTube**

Only YouTube publishes a general-purpose embeddable player SDK (IFrame Player API, Android/iOS Player APIs) that grants play/pause/seek/position to third parties. No premium subscription service publishes one. Cast SDKs (2.10) are sender-side only. Vendors' "SDKs" elsewhere are analytics, ads, or DRM client libraries — none expose playback control of the vendor's own catalog to a third-party app.

### 2.9 OTT partner APIs — **Exists, but not obtainable at our stage**

Netflix, Disney and Amazon operate partner integration programmes, but they are for device manufacturers, MVPDs/telcos and platform launchers — TV OEMs, set-top boxes, carrier bundles. The integration surfaces they expose are catalog/deep-link and entitlement, **not remote playback control by an unaffiliated companion app**. Netflix retired its public API in 2014 and has not reopened one. There is no self-serve tier, no published pricing, and no precedent of a consumer watch-party app obtaining playback control. Teleparty, Scener, Hearo — none of them have it; they all work around it.
This is the honest answer to "can we just get a partnership": the partnership that would unlock A6–A9 **does not exist as a product** at any of these companies.

### 2.10 Chromecast / Google Cast — **Limited, and interesting**

When a title is cast, the receiver runs the provider's receiver app and the _sender_ holds a `RemoteMediaClient` that can play, pause and seek. Two hard constraints:

- A sender can only control a session **it started**, or a session it joins where the receiver app permits it. Cross-user, cross-network control is not a thing; Cast is LAN-scoped.
- Each participant would need their own Cast device and their own cast session, and our app would need to be a legitimate sender for _that provider's_ receiver — which requires the provider's receiver app to accept a third-party sender. It does not.
  Value: for co-located viewers, Cast already solves the problem and StreamFlow is unnecessary. For remote viewers — our entire use case — Cast contributes nothing. Do not build on it.

### 2.11 AirPlay — **Unusable**

AirPlay 2 is LAN-scoped, sender-controlled, and offers no third-party API to control another app's AirPlay session. Same conclusion as Cast, with less surface.

### 2.12 DRM restrictions — **The structural blocker**

Premium OTT content is delivered under licence terms that require the playback path to be controlled end-to-end by the licensee's own client. Any third party inserting itself into play/pause/seek is, from the licensor's standpoint, an unlicensed playback client. This is not a technical inconvenience the vendors have failed to fix; it is the contractual reason the interfaces do not exist.

### 2.13 Widevine / FairPlay — **Unusable as a route**

Both enforce a secure media pipeline: decoded frames live in protected memory, the surface is marked `SECURE` (Android) or protected via HDCP/secure buffers (Apple). Consequences:

- You cannot read the playhead from outside the app.
- You cannot screenshot, screen-record, or screen-share the video (the frame is black to any capturer). **This independently kills the "just screen-share the movie" idea** as well as any overlay-based position OCR.
- Any circumvention is a DMCA §1201 / equivalent violation in most of our markets, and is prohibited outright by the project constitution.

### 2.14 App-to-app communication — **Unusable for control**

Android: `Intent` (launch, one-way), `ContentProvider`/`Service` binding (only where the target app exports an interface — no OTT app does), `AIDL` (same). iOS: URL schemes and universal links only. In both cases the OTT apps export **no control interface**. There is nothing to talk to.

### 2.15 Screen overlay techniques — **Usable for UI, Unusable for sync**

A `SYSTEM_ALERT_WINDOW` bubble over Netflix can show the room, who's talking, drift state and a "host paused — tap to pause" prompt. That is genuinely valuable and legal.
What it cannot do: read the video (2.13), read the position, or press anything (that's 2.4). Overlays are a _presentation_ mechanism, never a _control_ one. Also note Android blocks overlays from receiving touch pass-through over secure surfaces in several OEM builds, and Play policy requires clear disclosure.

---

## 3. Provider matrix

Legend: **Y** yes · **P** partial/conditional · **N** no.
"Detect playback" assumes an Android native build with Notification Listener access granted; it is **N everywhere on web and iOS**.

| Provider        | Launch title | Deep-link to title                          | Detect playback                                              | Control play       | Control pause      | Control seek                     | Synchronize        | Legal restrictions                                                                                                                            | Technical restrictions                                                                                        |
| --------------- | ------------ | ------------------------------------------- | ------------------------------------------------------------ | ------------------ | ------------------ | -------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Netflix**     | Y            | Y (detail page; profile gate common)        | N — publishes no usable external session during DRM playback | N                  | N                  | N                                | **N**              | ToS §4.6 prohibits automated access, circumvention, and use of the service other than through the interface provided; public API retired 2014 | Widevine L1 secure surface; no SDK; no exported IPC; frame-ancestors blocks embedding                         |
| **Prime Video** | Y            | Y (`/detail/{ASIN}`; region + profile gate) | P — session sometimes published, metadata sparse             | N                  | N                  | N                                | **N**              | Amazon Conditions of Use prohibit automated interaction and unauthorized clients                                                              | Widevine/PlayReady; no third-party player SDK; no exported control                                            |
| **Disney+**     | Y            | Y (`/video/{id}`)                           | P — inconsistent by app version                              | N                  | N                  | N                                | **N**              | Subscriber Agreement prohibits automated access and unauthorized devices                                                                      | Widevine L1; no SDK; embedding blocked                                                                        |
| **JioHotstar**  | Y            | Y (`/in/{slug}`)                            | P                                                            | N                  | N                  | N                                | **N**              | ToU prohibits automated access; India geo-lock                                                                                                | Widevine; aggressive app-side link handling; no SDK                                                           |
| **SonyLIV**     | Y            | P — link shape unstable across web/app      | P                                                            | N                  | N                  | N                                | **N**              | ToU prohibits automated access; geo-restricted                                                                                                | Widevine; no SDK; inconsistent universal links                                                                |
| **Zee5**        | Y            | P                                           | P                                                            | N                  | N                  | N                                | **N**              | ToU prohibits automated access; geo-restricted                                                                                                | Widevine; no SDK                                                                                              |
| **Apple TV+**   | Y            | Y (`tv.apple.com`, opens Apple TV app)      | N on Android (app parity limited); N on iOS by platform      | N                  | N                  | N                                | **N**              | Apple Media Services T&Cs prohibit unauthorized clients                                                                                       | FairPlay secure pipeline; no third-party control API on any platform                                          |
| **YouTube**     | Y            | Y                                           | **Y**                                                        | **Y**              | **Y**              | **Y**                            | **Y — true sync**  | YouTube API ToS permits embedded playback; must retain player chrome, no ad-skipping, no download                                             | IFrame/Player API required; some videos are embed-disabled or age/region-gated; Premium-only content excluded |
| **Hulu**        | Y            | Y (US only)                                 | P                                                            | N                  | N                  | N                                | **N**              | ToS prohibits automated access; US-only                                                                                                       | Widevine; no SDK                                                                                              |
| **HBO Max**     | Y            | Y                                           | P                                                            | N                  | N                  | N                                | **N**              | ToS prohibits automated access                                                                                                                | Widevine; no SDK; region-gated                                                                                |
| **Crunchyroll** | Y            | Y                                           | P                                                            | N                  | N                  | N                                | **N**              | ToS prohibits automated access; some catalog Premium-gated                                                                                    | Widevine; no third-party control SDK                                                                          |
| **Peacock**     | Y            | Y (US only)                                 | P                                                            | N                  | N                  | N                                | **N**              | ToS prohibits automated access; US-only                                                                                                       | Widevine; no SDK                                                                                              |
| **Paramount+**  | Y            | Y                                           | P                                                            | N                  | N                  | N                                | **N**              | ToS prohibits automated access                                                                                                                | Widevine; no SDK                                                                                              |
| **Pluto TV**    | Y            | Y                                           | P                                                            | **P — unverified** | **P — unverified** | P — linear channels have no seek | **P — unverified** | AVOD; ToS still prohibits unauthorized clients — an embed route must be confirmed in writing before we claim it                               | Much content is linear (no seek semantics at all); DRM lighter but embedding not sanctioned                   |
| **Tubi**        | Y            | Y                                           | P                                                            | **P — unverified** | **P — unverified** | **P — unverified**               | **P — unverified** | AVOD; ToS prohibits unauthorized clients; ad-insertion must not be bypassed                                                                   | No public embed SDK; any route must preserve ads and be confirmed in writing                                  |

Two rows only are green on synchronize: **YouTube**, plus **local files** (not listed above; StreamFlow-hosted `<video>` element, full control, already in the catalog as Supported).

The Pluto TV / Tubi "P — unverified" cells are the **only** entries in this matrix worth investigating further, and they must be treated as **N** until a written permission or a documented public embed API exists. Do not implement against them on optimism.

---

## 4. Why the exact experience is impossible, precisely

Four independent walls. Any one of them alone is sufficient; all four apply simultaneously to twelve of the fifteen providers.

**4.1 There is no interface.** A6–A9 require an addressable command endpoint on the guest's playback session. None of Netflix, Prime, Disney+, Hotstar, SonyLIV, Zee5, Apple TV+, Hulu, HBO Max, Crunchyroll, Peacock or Paramount+ exposes one — not over HTTP, not over IPC, not over a Cast receiver, not through an SDK. This is not an access-control problem we could talk our way past; **the function does not exist to be called.**

**4.2 The terms forbid it.** Every provider's terms carry the same clause family: use the service only through the interface provided; no automated access; no unauthorized clients or devices; no modification or interference. Driving another user's Netflix playback from our server is squarely inside all four prohibitions, regardless of the mechanism used. This applies equally to the Accessibility-Service route, which is why "technically we could tap the button" is not a route.

**4.3 DRM makes the state unreadable.** Even the weaker goal — _observe_ the guest's position accurately enough to correct drift — is blocked. Widevine L1 and FairPlay place frames and the playback surface in protected memory. Position is not exposed outside the licensee's client except through MediaSession, at the licensee's discretion, which the premium services withhold. **Without a position read, closed-loop sync is not implementable regardless of control.**

**4.4 The platforms forbid the workarounds.** iOS offers no cross-app observation or control at all, by design. Android offers Accessibility Services, and Google Play policy prohibits using them for this. So the one platform with a technical route has a distribution route that closes it.

**Corollary — why partnership does not rescue it (§2.9):** the partner programmes that exist are for hardware platforms and distribution bundles, and their surfaces are catalog and entitlement, not playback control. There is no product to buy here. Pursuing it is a business-development gamble on something no competitor — including Hearo — has ever obtained.

---

## 5. Where the current build actually stands

Assessed against the matrix, the shipped implementation is already at, not below, the honest technical ceiling:

- `src/domain/providers/shared-content.ts` — A1/A2 intake. **Honest and correct.** It reads only what the share sheet hands over and refuses unknown hosts. Its limitation is real: it recovers title, series, season and episode from _prose_, and **cannot recover runtime or artwork**, because a share payload contains neither and fetching them would mean scraping. A2 is therefore met at 4 of 6 fields, and the missing two cannot be filled without either an OTT metadata partnership or a licensed third-party metadata provider (TMDB/JustWatch class) — see §7.
- `src/domain/providers/provider-launch-coordinator.ts` — A5. **Correct and unusually well-disciplined.** It already classifies to `supported` / `manual_sync` / `deep_link` / `unsupported`, and already hardcodes `requiresManualPlay: true` for every class including `supported`, with the comment that the countdown coordinates people, not players. That line is this ADR's conclusion, written a year early.
- ADR-003 (one sync mode per room) — **still correct**, but its `controlled` branch is reachable only for YouTube and local files. The document reads as though `supported` providers are a growing set; per this matrix, that set is closed.
- Countdown + shared clock + drift cues + voice — **this is the product**, and it is the same thing Hearo does for these providers.

**Where the product story overpromises:** the MVP Spec provider matrix lists Netflix, Prime, Disney+/Hotstar and SonyLIV as "Manual Sync", which is accurate, but the surrounding product language ("synchronize playback", "watch together in perfect sync") invites A6–A9 expectations we will never meet on those providers. The v2 roadmap line "verified provider remote control" should be struck — it is not a scheduling problem, it is unavailable.

---

## 6. The closest achievable architecture

Three tiers, assigned per provider by the catalog, surfaced honestly in the UI.

```text
Tier A — CONTROLLED SYNC (true A6–A9)
  YouTube (IFrame/Player API) · local files · [Pluto/Tubi only if §3 verified]
  Host commands drive an embedded player StreamFlow owns.
  Play/pause/seek propagate through the existing PlaybackSyncEngine.
  Drift correction is closed-loop: real position in, correction out.

Tier B — ASSISTED SYNC (Android native only; new)
  Any provider whose app publishes a readable MediaSession.
  Host's real playback state is OBSERVED, never controlled.
    host pauses in Netflix  -> MediaSession reports paused
                            -> room broadcasts "host paused at 00:41:12"
                            -> guests get an overlay/notification prompt
                            -> guest taps once, or pauses themselves
  Loop is open on the guest side, closed on the host side.
  This is the entire delta a native app buys us. It is real, and it is
  the difference between a blind countdown and a live room.

Tier C — COORDINATED MANUAL SYNC (today; web, iOS, and Android fallback)
  Deep link to the exact title + server-anchored countdown + voice +
  drift re-sync cues. Both sides open loop. Ships now, everywhere.
```

**What Tier B requires:** an Android Capacitor/native shell with a Notification Listener permission flow, a `MediaSessionManager` observer, a foreground service, and an optional `SYSTEM_ALERT_WINDOW` room bubble. It must be built as an **observation-only** capability with no transport commands issued to foreign sessions, and with prominent disclosure at permission request. Provider coverage must be measured empirically per app before any provider is promoted into Tier B; assume none until proven.

**What Tier B does not require and must never include:** an AccessibilityService, any credential or cookie handling, any screen capture of a provider surface, any scraping.

**iOS:** stays Tier C permanently. A native iOS build is justified only by App Store presence, push notifications, and share-extension polish — never by sync capability. Do not fund it as a sync investment.

**Web/PWA:** stays Tier A (YouTube, local) + Tier C (everything else) and remains the primary surface.

---

## 7. Decisions required from the product owner

1. **OTT partnerships** — recommendation: **do not pursue** for playback control (§4 corollary). _Do_ consider a licensed metadata provider to close the runtime/artwork gap in A2, which is a real and cheap product win.
2. **Android native build for Tier B** — recommendation: **yes, scoped to observation**, after empirical MediaSession coverage measurement across the top four providers in our market. If coverage measures at zero or one provider, cancel it; the whole justification is the observation delta.
3. **Positioning** — recommendation: **change it.** Stop saying we synchronize their Netflix. Say we keep the room in sync: same title, same start, live voice, and we tell you the moment you drift. Every provider card should state its tier in plain language before a room is created, so no user forms the A6–A9 expectation.
4. **Roadmap** — strike "verified provider remote control" from v2. Replace with "assisted sync (Android observation)".

---

## 8. Recommendation: web app or native?

**Remain web-first. Add Android native as a capability shell, not a replacement. Do not build iOS native for sync reasons.**

Reasoning:

- Native buys **zero** control capability on any provider (§2.2, §2.3, §4).
- Native buys **one** real capability, Android-only: playback observation via MediaSession (§2.5), which upgrades the host side of the loop from blind to live. That is a genuine product improvement and the only technical argument for native that survives this review.
- iOS native buys nothing at all for sync. Its case is distribution and polish, decided separately.
- The web PWA already delivers Tier A for the two providers where true sync is possible and Tier C everywhere else — i.e. the full legal ceiling minus the Android observation delta.
- Rewriting to native would cost the portability the project constitution mandates, in exchange for a capability that does not exist.

**Conditions that would flip this answer:** a premium provider publishes a third-party playback-control SDK or a companion-app partner tier (none is on any public roadmap); or the product pivots to hosting its own licensed catalog, at which point StreamFlow becomes a streaming service and this ADR is void.

---

## 9. Consequences

- ADR-003 stands; its `controlled` branch is a closed set (YouTube, local files) rather than a growing one.
- MVP Spec §7 provider matrix is superseded by §3 above.
- `requiresManualPlay: true` in the launch coordinator is **ratified as permanent** for every non-Tier-A provider, not a temporary v1 limitation.
- Any future proposal to control premium OTT playback — by accessibility service, overlay automation, screen capture, credential reuse, or scraping — is refused by this ADR without further review.
- No code changes follow from this document. Product repositioning and the Tier B feasibility measurement are separate, subsequent decisions.
