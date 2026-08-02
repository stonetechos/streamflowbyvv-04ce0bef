# StreamFlow by Vedora Vision — MVP Functional Specification v1.0

**Status:** Approved
**Scope:** Product definition only — WHAT ships in Version 1.0, not HOW.
**Relationship to existing documents:** Extends Foundation Specification v1.0 and ADR-001 (Po Intent-Driven AI Agent). Both are frozen and unmodified by this document. Any conflict is resolved in favour of the Foundation Specification; changes to it require a new numbered ADR.

---

## 0. MVP thesis

Two to four friends, each with their own subscriptions, start a title at the same moment and talk while watching.

Everything that does not serve that sentence is deferred. Because no provider is verified for remote control (Foundation §7), **the MVP ships coordinated-manual-sync as the primary, first-class experience** — countdown-driven start, drift check-ins, and voice — not as a fallback or a degraded mode.

---

## 1. Target platforms

- **Primary:** Progressive Web App — desktop and mobile browsers, installable, offline-aware shell.
- **Secondary:** Android via Capacitor — same codebase, native microphone permissions.
- **Future:** iOS, desktop shells.

---

## 2. User types

| Type | v1.0 capability |
|---|---|
| Guest | Open an invite link, see a room preview, must sign up or sign in to join |
| Registered User | Profile, rooms, recent partners, settings, Po |
| Room Host | Creates the room, owns countdown and provider choice, can remove participants, ends the room |
| Room Participant | Joins, confirms readiness, uses voice, self-reports sync state |
| Administrator | **Future** — role reserved in the data model; no admin surface in v1 |
| Moderator | **Future** — role reserved only |

---

## 3. Complete user journeys

Each journey is stated as: Goal · Entry point · Step-by-step flow · Expected result · Possible errors · Recovery behaviour.

### 3.1 Sign Up
- **Goal:** Create an account.
- **Entry:** Landing page, invite link, Po prompt.
- **Flow:** Email + password (or magic link) → verification email → verify → display name, avatar, language → land on Home.
- **Result:** Authenticated session and a created profile.
- **Errors:** Email already in use, weak password, verification not delivered, network failure.
- **Recovery:** Inline field errors, resend verification, retry with input preserved. A pending invite is remembered and resumed automatically after verification.

### 3.2 Sign In
- **Goal:** Return to the account.
- **Entry:** Landing page, invite link, expired session redirect.
- **Flow:** Credentials → session established → return to intended destination.
- **Result:** Authenticated session at the requested destination.
- **Errors:** Wrong credentials, unverified email, rate limited, offline.
- **Recovery:** Generic failure message (no account enumeration), resend verification, visible cooldown timer, retry once online.

### 3.3 Forgot Password
- **Goal:** Regain access.
- **Entry:** Sign-in screen.
- **Flow:** Enter email → reset link → set new password → automatic sign-in.
- **Result:** New password stored, session active.
- **Errors:** Link expired or already used, weak password.
- **Recovery:** Request a new link. The confirmation message is always neutral and identical regardless of whether the email exists.

### 3.4 Create Profile
- **Goal:** Be recognisable to friends.
- **Entry:** Post-signup step or Settings → Profile.
- **Flow:** Display name → avatar → language → timezone.
- **Result:** Profile stored and shown in rooms.
- **Errors:** Name taken or invalid, upload too large or wrong file type.
- **Recovery:** Name suggestions, size and format guidance, skip-and-continue with sensible defaults.

### 3.5 Create Room
- **Goal:** A space to watch together.
- **Entry:** Home button, or Po ("create a room").
- **Flow:** Optional room name → visibility is private-only in v1 → optional provider intent → room created in **Waiting Room** state with a shareable invite.
- **Result:** Host is inside a Waiting Room with an invite ready.
- **Errors:** Not authenticated, creation rate limit, offline.
- **Recovery:** Sign in and resume creation, cooldown message with remaining time, queue creation until connectivity returns.

### 3.6 Join Room
- **Goal:** Get into a friend's room.
- **Entry:** Invite link, in-app notification, Recent rooms.
- **Flow:** Open link → guests hit the auth wall with the invite preserved → membership validated → enter Waiting Room → microphone permission prompt (skippable) → mark **Ready**.
- **Result:** Participant present, readiness visible to everyone.
- **Errors:** Invite expired or revoked, room full, room closed, participant removed or blocked.
- **Recovery:** Prompt to request a fresh invite from the host; a closed room shows a terminal state with a "create your own room" action.

### 3.7 Invite Friend
- **Goal:** Bring someone in.
- **Entry:** Waiting Room → Invite.
- **Flow:** Pick from recent partners or enter an email/handle → in-app and email invite sent → status shown as pending / accepted / declined.
- **Result:** Invitee notified, host sees live status.
- **Errors:** User not found, already a member, invite limit reached.
- **Recovery:** Fall back to a copyable invite link.

### 3.8 Accept Invitation / Decline Invitation
- **Goal:** Respond to an invite.
- **Entry:** Notification centre, email, direct link.
- **Flow (accept):** Continue into the Join Room flow. **(decline):** Invite closed, host informed.
- **Result:** Participant joins, or the host sees a declined status.
- **Errors:** Invite expired, room already closed.
- **Recovery:** Clear terminal state plus an "ask the host to re-invite me" action.

### 3.9 Share Invite Link
- **Goal:** Invite someone outside the app.
- **Entry:** Waiting Room → Share.
- **Flow:** Copy link, or use the native share sheet. The link carries the room reference and a token with an expiry.
- **Result:** Link in the host's clipboard or share target.
- **Errors:** Clipboard blocked by the browser, share API unsupported.
- **Recovery:** Show the raw link in a selectable field.

### 3.10 Enable Voice Chat / Disable Voice Chat
- **Goal:** Talk while watching.
- **Entry:** Waiting Room, or the in-room control bar.
- **Flow (enable):** Request microphone permission → join the voice session → connected indicator appears. **(disable):** Leave voice, remain in the room.
- **Result:** Two-way audio with visible state, or a clean voice-off state.
- **Errors:** Permission denied, blocked at OS level, no input device, token or service failure.
- **Recovery:** Browser-specific permission instructions, device picker, retry. **The room stays fully usable without voice.**

### 3.11 Leave Room
- **Goal:** Exit without ending it for others.
- **Entry:** In-room menu.
- **Flow:** Confirm → leave voice → presence updated → return Home.
- **Result:** Room continues; the user may rejoin while it is open.
- **Errors:** Network failure mid-leave.
- **Recovery:** Presence is reconciled server-side by heartbeat timeout.

### 3.12 End Room
- **Goal:** Close the session for everyone.
- **Entry:** Host-only in-room menu.
- **Flow:** Confirm → all participants notified → everyone returned Home → room becomes read-only closed.
- **Result:** Room in Closed state, visible in Recent for a limited period.
- **Errors:** Not host, network failure.
- **Recovery:** Permission explanation; retry on reconnect.

### 3.13 Rejoin After Disconnect
- **Goal:** Get back into the session.
- **Entry:** Automatic on connectivity restore.
- **Flow:** Loss detected → offline banner and offline mode → on restore, room state re-fetched, realtime and voice re-joined, position re-anchored → resume.
- **Result:** Participant back in the room with current state.
- **Errors:** Room closed while away, removed, session expired.
- **Recovery:** Explicit outcome screen for each case — never a silent dead room.

### 3.14 Countdown Experience
- **Goal:** Everyone presses play at the same instant.
- **Entry:** Host action, once participants are Ready.
- **Flow:** Host sets a duration (default from preference) → all clients show a counter anchored to server time → at zero, a clear "Play now" cue with an audio ping and haptics where available.
- **Result:** Simultaneous start across all participants.
- **Errors:** A participant is not ready, someone joins mid-countdown, host cancels.
- **Recovery:** Host can cancel or restart; a late joiner is included in the next countdown.

### 3.15 Playback Synchronization (manual-sync mode)
- **Goal:** Stay together through the title.
- **Entry:** Immediately after the countdown cue.
- **Flow:** Each user plays in their own provider tab or app. The room shows a shared elapsed timer as the reference. Anyone can raise "I'm behind" or "I'm ahead" → the host triggers a re-sync countdown or announces a target timestamp.
- **Result:** The group stays within the drift tolerance.
- **Errors:** Drift beyond tolerance, a missed cue, someone's provider buffering.
- **Recovery:** One-tap re-sync countdown from any participant's request.

### 3.16 Manual Sync Experience (pause / resume / seek)
- **Goal:** Interrupt and restart together.
- **Entry:** Any participant's Pause request.
- **Flow:** Pause request broadcasts a prompt to everyone → all pause in their own player → Resume runs through a short countdown. A seek is announced as a target timestamp, then re-synced by countdown.
- **Result:** Coordinated interruption without losing alignment.
- **Errors:** A participant misses the prompt.
- **Recovery:** Their sync state shows as unconfirmed; the host re-runs the countdown.

### 3.17 Provider Selection
- **Goal:** Agree on where to watch.
- **Entry:** Waiting Room, or Po.
- **Flow:** Choose from the provider matrix → the ComplianceService verdict is shown inline (mode and limits) → title entered manually, or via search where legally available → deep link opened in the user's own session.
- **Result:** Everyone knows the provider, title and sync mode.
- **Errors:** Provider unavailable in region, unverified provider, participant has no subscription.
- **Recovery:** Plain-language explanation and suggested alternative providers.

### 3.18 Subtitle Selection / Audio Language Selection
- **Goal:** Everyone watches with compatible tracks.
- **Entry:** Waiting Room, Settings, or Po.
- **Flow:** In v1 these are **preferences and shared room announcements** ("Hindi audio, English subtitles") that each user applies in their own player. StreamFlow does not control provider tracks.
- **Result:** A visible room note stating the agreed tracks.
- **Errors:** A track is unavailable for one participant.
- **Recovery:** The participant flags it; the room note is updated to an available combination.

### 3.19 Settings
- **Goal:** Tune the experience.
- **Entry:** Avatar menu → Settings.
- **Flow:** Navigate the pages in §10; changes apply immediately; language switches at runtime.
- **Result:** Preferences persisted to the account.
- **Errors:** Save failure, offline.
- **Recovery:** Optimistic UI with rollback and a retry action.

### 3.20 Logout
- **Goal:** End the session on this device.
- **Entry:** Avatar menu.
- **Flow:** Confirm if in an active room → leave the room and voice → clear session and caches → landing page.
- **Result:** Fully signed out, no residual room presence.
- **Errors:** Network failure during sign-out.
- **Recovery:** Local session cleared regardless; server session invalidated on next contact.

---

## 4. Feature classification

### MVP — v1.0
Email authentication and password reset · profile · private rooms · invite links and direct invites · Waiting Room with readiness · server-anchored synchronized countdown · manual-sync playback coordination with drift re-sync · voice chat (mute, device selection, quality indicator) · presence · in-app and email notifications · provider matrix with compliance verdicts and deep links · Po via text and voice for the core intents · settings including accessibility and privacy · localization framework with two launch locales · analytics · offline banner and reconnect · PWA install.

**Why:** this is the minimum set that produces one complete, successful shared viewing session.

### Version 1.1
Recent partners promoted to real friends and friend requests · scheduled watch parties with reminders · richer Po memory management UI · Android Capacitor build · per-room text chat lane · host migration · additional locales.

**Why:** strengthens retention and convenience, but nothing here is required for a first successful session.

### Version 2
Verified provider plugins with true remote control where legally cleared · rooms larger than four · video chat · shared playlists · watch history · communities.

**Why:** each depends on provider validation, scale work, or an entirely new product domain.

### Future
AI recommendations · calendar integration · smart-TV and home-automation control · third-party plugin ecosystem · moderation and administration consoles · public discoverable rooms.

**Why:** these expand the product beyond the core promise and require governance, partnerships, or legal clearance that does not exist yet.

---

## 5. Room experience — complete lifecycle

```text
Created
  -> Waiting Room
  -> Invites sent
  -> Participants joining
  -> Voice ready
  -> Provider selected
  -> Countdown
  -> Watching  ->  Pause  ->  Resume
                ->  Seek announced -> re-sync countdown
                ->  Reconnect
  -> Participant leaves
  -> Room closed (host ends it, or inactivity timeout)
```

State rules for v1:
- The host is authoritative for countdown, provider selection and closure.
- A room with zero present participants auto-closes after the inactivity window (30 minutes, Foundation §14.3). Auto-close is recorded as `abandoned`; a host-ended room is recorded as `ended` (ADR-002).
- Closed rooms are read-only and appear in Recent for 30 days (Foundation §14.3).
- **Host migration is v1.1.** In v1, if the host leaves permanently, the room closes with notice to everyone.
- Room capacity in v1 is four participants, enforced in the domain layer; the schema permits 2–8 as a future envelope only (ADR-013).
- **Lifecycle labels map onto persisted status (ADR-002):** Waiting Room = `lobby`, Watching = `active`, Paused = `paused`, Closed by host = `ended`, Auto-closed = `abandoned`. The watching screen reads playback condition from `room_state.playback_status`, never from the room's lifecycle status (ADR-004).
- **Sync mode is a property of the room (ADR-003):** it is set from the selected provider and cannot change while a playback session is open. A participant who cannot use the controlled path is downgraded to the room's mode; the room is never changed to match one participant.
- **Blocking during an active room (ADR-011):** a block takes effect immediately for future invites and joins, the in-progress room continues to its natural end, and the blocking user may leave at any time.
- **Guest preview before the auth wall (ADR-010):** an unauthenticated visitor with a valid invite link sees only the room name, the inviter's display name and avatar, and the invite's validity — never the member list, provider, room state, or room code.

---

## 6. Po experience in Version 1

Po's architecture, intent pipeline, tool contract and guardrails are defined in ADR-001 and unchanged here. This section states only the scope exposed to users in v1.

### Included in v1
- **Voice input** (press-to-talk) and **text input**, both entering the same intent pipeline.
- **Intent understanding** for: create a room, invite people, start a countdown, change the countdown duration, search or choose a provider, explain the sync steps, announce audio/subtitle preferences, leave or end the room, open settings.
- **Clarification** — Po asks a targeted question when a required slot is missing rather than guessing.
- **Confirmation** before irreversible or group-visible actions (ending a room, removing a participant, sending invites).
- **Compliance explanation** — plain-language reasons when an action is refused, sourced from the ComplianceService verdict.
- **Playback assistance** — walking a user through the manual-sync steps and re-sync.
- **Error explanation** — translating technical failures into next steps.
- **Graceful failure** — if Po is unavailable, it says so and points to the manual control for the same action; Po is never the only path to a feature.
- **Opt-in preference memory** with view, edit and delete in Settings.

### Reserved for future versions
Recommendations and taste modelling · conversation summaries · scheduling and calendar tools · conversational languages beyond the launch locales · proactive unsolicited suggestions · full-app accessibility narration · smart-TV and home-automation tools · tools supplied by third-party plugins.

Per ADR-001, all of the above are added as **new tools and adapters**, never as modifications to Po Core.

---

## 7. Streaming provider capability matrix

Classification vocabulary: **Supported** (StreamFlow may control playback) · **Manual Sync** (countdown coordination and deep link only) · **Experimental** (behind a flag, opt-in, may break) · **Unverified** (listed but not legally or technically validated) · **Unavailable** (refused).

| Provider | v1.0 status | What v1 actually does |
|---|---|---|
| YouTube | **Supported** | True synchronized playback via the public embed/API, within its terms |
| Local media file | **Supported** | The user's own file, synchronized locally |
| Netflix | **Manual Sync** | Countdown plus deep link only — no control, no scraping, no DRM interaction |
| Prime Video | **Manual Sync** | Same |
| Disney+ / Hotstar | **Manual Sync** | Same |
| SonyLIV | **Manual Sync** | Same |
| Any other named service | **Unverified** | Listed for coordination, manual sync only, clearly labelled unverified |
| Anything requiring a DRM, geo, subscription or paywall workaround | **Unavailable** | Refused with an explanation |

Rules:
- No provider is assumed controllable. Every non-YouTube entry begins as **Unverified** and may only be promoted by a recorded legal validation (Foundation §19).
- **Experimental** is reserved for providers that pass validation but whose integration is not yet stable; no provider ships in this state in v1.
- Every provider action passes through the ComplianceService before it reaches the user.

---

## 8. Voice chat

- **Joining:** automatically on entering the room (if the preference allows) or on demand from the control bar.
- **Leaving:** leave voice without leaving the room.
- **Mute / Unmute:** visible state for self and for others, plus an optional push-to-talk mode.
- **Microphone selection:** device picker, remembered per device.
- **Speaker selection:** output picker where the browser exposes it, otherwise the OS default with an explanation.
- **Voice quality indicators:** per-participant speaking indicator and a three-level connection-quality badge (good / degraded / poor).
- **Network recovery:** automatic re-join on connectivity restore with a visible "reconnecting" state and a manual retry.
- **Failure behaviour:** voice never blocks the room. If it cannot start, the user is told exactly why (permission, device, service) and continues with countdown, coordination and Po fully intact.

---

## 9. Notifications

| Notification | Trigger | Channels in v1 |
|---|---|---|
| Invitation received | Someone invites you | In-app (toast) + email |
| Invitation accepted | Invitee joins | In-app (toast) |
| Invitation declined | Invitee declines | In-app |
| Countdown started | Host starts the countdown | In-app (toast + audio cue) |
| Participant joined | Someone enters the room | In-app (in-room) |
| Participant left | Someone leaves | In-app (in-room) |
| Room closed | Host ends the room or it times out | In-app (toast) |
| Voice disconnected | Voice session dropped | In-app (toast) |
| Reconnect required | Realtime connection lost | In-app (persistent banner) |
| System announcement | Product or compliance notice | In-app |
| Scheduled party reminder | Upcoming scheduled room | **v1.1** |

**Channels vs. presentation (ADR-007):** v1 has exactly two delivery channels — `in_app` and `email`. Toast, audio cue and persistent banner are *presentation modes* of the `in_app` channel, not separate channels, and are not independently subscribable. `push` exists in the schema as a reserved value and is emitted by no v1 code path. Every category is individually mutable in Settings → Notifications; presentation modes are not.


---

## 10. Settings pages

| Page | Contents | Field ownership (ADR-005) |
|---|---|---|
| Profile | Display name, avatar, email, account deletion entry point | `profiles` |
| Language | UI language, preferred audio language, preferred subtitle language | `localization_preferences` |
| Appearance | Theme; text size is surfaced here but owned by Accessibility | `appearance_preferences`; `font_scale` from `accessibility_preferences` |
| Voice | Join muted, push-to-talk, auto-join; default microphone and speaker | Portable behaviour persisted with `privacy_preferences`; **device selection is device-local and never persisted** |
| Notifications | Per-category toggles and channel choice (`in_app`, `email` only) | `notification_preferences` |
| Accessibility | Reduced motion, high contrast, large text (`font_scale`), captions preference | `accessibility_preferences` |
| Privacy | Presence visibility, activity history, data export, account deletion | `privacy_preferences` |
| Provider Preferences | Favourites, default provider (single value); **region is shown read-only here and owned by Language** | `localization_preferences.region_code` is the single source of region |
| Po Preferences | Enable/disable, voice-only or text-only, saved memories with edit, export and delete | `privacy_preferences.po_memory_opt_in` + `po_preference_memories` |
| Future AI Settings | Reserved page, hidden behind a feature flag in v1 | — |

No preference value is defined in two places. A page may *display* a field owned by another page, but only one page writes it.


---

## 11. Error states

| Error | Cause | User message | Recovery |
|---|---|---|---|
| Internet lost | Connection dropped | "You're offline. We'll reconnect you." | Offline banner, cached room shell, automatic re-sync on restore |
| Provider unsupported | ComplianceService verdict is Unavailable | "We can't control playback on X — here's how to watch together anyway." | Offer the manual-sync countdown flow |
| Invitation expired | Token past expiry or revoked | "This invite has expired." | Ask the host for a new invite |
| Authentication failed | Bad credentials or expired session | "We couldn't sign you in." | Retry, reset password, re-authenticate preserving the destination |
| Voice failure | Token, device or service error | "Voice isn't connecting right now." | Retry, device picker, continue without voice |
| Sync failure | Drift beyond tolerance or a missed cue | "You may be out of sync." | One-tap re-sync countdown |
| Countdown cancelled | Host cancelled, or a participant dropped | "The host cancelled the countdown." | Host restarts when everyone is ready |
| User removed | Host removed the participant | "You were removed from this room." | Return Home; no automatic re-entry |
| Permission denied | Not a member, or not the host | "You don't have permission to do that." | Explain who can, offer to ask the host |
| Microphone permission denied | Browser or OS block | "We need microphone access for voice chat." | Browser-specific instructions, continue without voice |
| Unsupported browser | Missing WebRTC or media APIs | "This browser can't run voice chat." | List supported browsers, allow the no-voice mode |

Every error message is a localized string key, states a cause in plain language, and offers exactly one primary recovery action.

---

## 12. Accessibility — minimum standard for v1

- **Keyboard navigation:** every action reachable and operable by keyboard, visible focus rings, logical tab order, skip links, no keyboard traps in modals or the countdown overlay.
- **Screen reader:** semantic landmarks and ARIA labelling; live regions announce countdown ticks, join/leave events, sync warnings and Po replies.
- **Captions:** captions preference surfaced in Settings and announced in-room as part of the agreed track note.
- **High contrast:** a dedicated high-contrast theme meeting WCAG 2.1 AA contrast ratios.
- **Large text:** text scaling up to 200% without layout breakage or clipped controls.
- **Reduced motion:** `prefers-reduced-motion` respected; the countdown degrades to a plain numeric counter with no animation.
- **Voice accessibility:** Po provides a spoken path to every core action, and every Po action has a non-voice equivalent.
- **Targets:** interactive targets at least 44×44 px.
- **Acceptance bar:** WCAG 2.1 AA.

---

## 13. Localization

- Every user-facing string is a translation key from day one — no hardcoded copy anywhere, enforced at code review.
- Launch locales for v1.0 are **English (`en`)** and **Hindi (`hi-IN`)**, with runtime switching and no page reload. The localization system supports unlimited future locales without redesign (Foundation §17); adding a locale never requires a migration.
- Fallback chain resolves to English for missing keys.
- Locale-aware dates, durations, numbers and relative times.
- Pluralization and gender-neutral phrasing support.
- Layout is RTL-ready from v1 even before an RTL locale ships.
- Po prompts, clarification phrasing and all error copy are localized assets, not inline strings.

---

## 14. Analytics events

All events route through the AnalyticsService. No personally identifiable information in payloads; user references are opaque identifiers.

- **Auth:** `signed_up`, `signed_in`, `signed_out`, `password_reset_requested`
- **Room:** `room_created`, `room_joined`, `room_left`, `room_closed`, `participant_removed`
- **Invitations:** `invitation_sent`, `invitation_accepted`, `invitation_declined`, `invite_link_copied`
- **Sync:** `countdown_started`, `countdown_cancelled`, `countdown_completed`, `playback_started`, `playback_paused`, `playback_resumed`, `resync_requested`, `sync_lost`, `sync_restored`
- **Voice:** `voice_joined`, `voice_left`, `voice_muted`, `voice_failed`, `voice_reconnected`
- **Provider:** `provider_selected`, `provider_blocked_by_compliance`
- **Po:** `po_activated`, `po_intent_recognized`, `po_clarification_requested`, `po_command_completed`, `po_command_failed`, `po_memory_saved`
- **System:** `reconnect_started`, `reconnect_succeeded`, `error_shown`, `settings_changed`, `language_changed`, `pwa_installed`

---

## 15. Non-goals for Version 1.0

Explicitly **not** in v1.0:

Video chat · screen sharing · communities · public or discoverable rooms · AI recommendations and taste modelling · calendar integration · watch-history intelligence · plugin ecosystem · text chat lane · rooms larger than four participants · host migration · payments and subscriptions · moderation and administration tooling · iOS and desktop builds · push notifications · any form of provider control that has not been legally validated.

---

## 16. Definition of done for Version 1.0

Two people, on different networks and different devices, complete this run without assistance:

sign up → create room → invite → join → voice connected → countdown → watch a full title in manual sync → recover from one deliberate disconnection → end room

with no unexplained error, every string localized, the whole flow operable by keyboard and screen reader, and every provider action passing through the ComplianceService.

Sync quality during the run must hold at Good or better (≤250 ms) with any excursion above 500 ms triggering the re-sync prompt (Foundation §14.5).

---

## 17. Product constants referenced by this document

Normative values live in **Foundation Specification v1.0 §14** and are reproduced here for reading convenience only. If the two ever differ, Foundation wins.

| Constant | v1.0 value |
|---|---|
| Default countdown | 5 seconds |
| Countdown range | 3–60 seconds |
| Invite expiry | 24 hours |
| Join link expiry | 24 hours |
| Room inactivity timeout | 30 minutes |
| Recent room retention | 30 days |
| Sync quality — Excellent | ≤100 ms |
| Sync quality — Good | 101–250 ms |
| Sync quality — Warning | 251–500 ms |
| Sync quality — Re-sync required | >500 ms |

---

## 18. Amendment Register — Documentation Consolidation v1.0

| # | Change | Section | ADR |
|---|---|---|---|
| 1 | Lifecycle labels mapped to persisted status; auto-close is `abandoned` | §5 | ADR-002 |
| 2 | Sync mode declared a room property, immutable during playback; participants downgrade | §5 | ADR-003 |
| 3 | Watching screen reads `room_state.playback_status`, not room lifecycle | §5 | ADR-004 |
| 4 | Settings pages given explicit field ownership; region owned by Language; audio devices device-local | §10 | ADR-005 |
| 5 | Notification channels reduced to `in_app` and `email`; toast, audio cue, banner reclassified as presentation | §9 | ADR-007 |
| 6 | Guest preview scope before the auth wall stated | §5 | ADR-010 |
| 7 | Block-during-active-room behaviour stated | §5 | ADR-011 |
| 8 | Room capacity 4 stated as domain policy over a wider schema envelope | §5 | ADR-013 |
| 9 | Launch locales fixed to `en` and `hi-IN` | §13 | Foundation §17 |
| 10 | Inactivity timeout, Recent retention, and sync quality thresholds resolved to fixed values | §5, §16, §17 | Foundation §14 |

Email invites (ADR-006) are, in v1, link invites delivered by email — no change to any journey in §3, recorded here for traceability.

