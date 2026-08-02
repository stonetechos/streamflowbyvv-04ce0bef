# StreamFlow — MVP Functional Specification v1.0

Extends Foundation Spec v1.0 and ADR-001 (both frozen, unmodified). Defines WHAT ships in v1.0, not HOW. Documentation only.

## 0. MVP thesis

Two to four friends, each with their own subscriptions, start a title at the same moment and talk while watching. Everything that does not serve that sentence is deferred. Because no provider is verified for remote control (Foundation §7), **the MVP ships coordinated-manual-sync as the primary, first-class experience** — countdown-driven start, drift check-ins, and voice — not as a fallback.

## 1. Target platforms

- **Primary:** Progressive Web App — desktop and mobile browsers, installable.
- **Secondary:** Android via Capacitor, same codebase, native mic permissions.
- **Future:** iOS, desktop shells.

## 2. User types

| Type | v1.0 capability |
|---|---|
| Guest | Open an invite link, see room preview, must sign up/in to join |
| Registered User | Profile, rooms, friends-lite (recent partners), settings, Po |
| Room Host | Creates room, owns countdown/provider choice, can remove participants, ends room |
| Room Participant | Joins, confirms readiness, voice, self-reported sync state |
| Administrator | **Future** — data model reserves role table; no admin UI in v1 |
| Moderator | **Future** — reserved role only |

## 3. Complete user journeys

Format: Goal · Entry · Flow · Result · Errors · Recovery.

**Sign Up** — Create account. Entry: landing, invite link, Po prompt. Flow: email+password (or magic link) → verify → display name + avatar + language → land on Home. Result: authenticated session, profile created. Errors: email in use, weak password, verification not delivered, network. Recovery: inline field errors, resend verification, retry with preserved input; pending invite is remembered and resumed after verification.

**Sign In** — Entry: landing/invite/expired session. Flow: credentials → session → return to intended destination. Errors: wrong credentials, unverified email, rate limited, offline. Recovery: generic failure message (no account enumeration), resend verification, cooldown timer, retry when online.

**Forgot Password** — Entry: sign-in. Flow: email → reset link → new password → auto sign-in. Errors: link expired/used, weak password. Recovery: request a new link; always show the same neutral confirmation.

**Create Profile** — Entry: post-signup or Settings. Flow: display name, avatar, language, timezone. Errors: name taken/invalid, upload too large or wrong type. Recovery: suggestions, size guidance, skip-and-continue with defaults.

**Create Room** — Goal: a space to watch together. Entry: Home button or Po. Flow: name (optional) → visibility private-only → provider intent (optional at creation) → room created in **Waiting Room** with a shareable invite. Errors: not authenticated, rate limit, offline. Recovery: sign-in then resume, cooldown message, queue creation until online.

**Join Room** — Entry: invite link, notification, recent rooms. Flow: open link → if guest, auth wall with invite preserved → membership check → enter Waiting Room → mic permission prompt (skippable) → mark Ready. Errors: invite expired/revoked, room full, room closed, removed/blocked. Recovery: request a fresh invite from host, show room-closed state with "create your own".

**Invite Friend** — Entry: Waiting Room. Flow: pick from recent partners or enter email/handle → send in-app + email invite → status shown pending/accepted/declined. Errors: user not found, already a member, invite limit. Recovery: fall back to copyable link.

**Accept / Decline Invitation** — Entry: notification centre, email, link. Accept → join flow. Decline → host informed, invite closed. Errors: expired, room already closed. Recovery: clear terminal state plus a "ask host to re-invite" action.

**Share Invite Link** — Entry: Waiting Room. Flow: copy link or native share sheet; link carries room + token with expiry. Errors: clipboard blocked, share unsupported. Recovery: show the raw link in a selectable field.

**Enable / Disable Voice Chat** — Entry: Waiting Room or in-room control bar. Flow: request mic permission → join voice → indicator shows connected. Disable: leave voice, stay in room. Errors: permission denied/blocked at OS level, no input device, token/service failure. Recovery: step-by-step permission instructions per browser, device picker, retry; **the room remains fully usable without voice**.

**Leave Room** — Participant exits; presence updates; may rejoin while the room is open. **End Room** — host-only, confirmed, all participants notified and returned Home; room becomes read-only closed.

**Rejoin After Disconnect** — Entry: automatic on reconnect. Flow: detect loss → banner + offline mode → on restore, re-fetch room state, re-join realtime and voice, re-anchor position → resume. Errors: room closed while away, removed, session expired. Recovery: explicit outcome screen; never a silent dead room.

**Countdown Experience** — Goal: everyone presses play at the same instant. Entry: host, when all Ready. Flow: host sets duration (default from preference) → all clients show a synchronized counter using server-anchored time → at zero, a clear "Play now" cue with haptic/audio ping. Errors: participant not ready, participant joins mid-countdown, host cancels. Recovery: host can cancel or restart; late joiner gets the next countdown.

**Playback Synchronization (manual-sync mode)** — After the cue, each user plays in their own provider tab/app. Room shows a shared elapsed timer as the reference. Any participant can raise "I'm behind/ahead" → host triggers a re-sync countdown or announces a target timestamp. Pause/Resume are **coordinated signals**: a participant requests pause, everyone is prompted to pause, resume goes through a short countdown. Errors: drift beyond tolerance, someone missing a cue. Recovery: one-tap re-sync.

**Provider Selection** — Entry: Waiting Room or Po. Flow: choose from the provider matrix → ComplianceService verdict shown inline (mode + limits) → title/reference entered manually or via search where legally available → deep link opened in the user's own session. Errors: provider Unavailable in region, unverified, no subscription. Recovery: plain-language explanation and alternative providers.

**Subtitle / Audio Language Selection** — v1 stores these as **preferences and shared room announcements** ("Hindi audio, English subs") that each user applies in their own player; StreamFlow does not control provider tracks. Errors: track unavailable for a user. Recovery: participant flags it; room note updates.

**Settings** — See §9. Changes apply immediately; language switches at runtime.

**Logout** — Confirm if in an active room → leave room and voice → clear session and caches → landing page.

## 4. Feature classification

**MVP** — email auth + password reset; profile; private rooms; invite links and direct invites; waiting room with readiness; synchronized countdown; manual-sync playback coordination with drift re-sync; LiveKit voice (mute, device select, quality indicator); presence; in-app + email notifications; provider matrix with compliance verdicts and deep links; Po (text + voice) for the core intents; settings incl. accessibility and privacy; localization framework with 2 launch locales; analytics; offline banner and reconnect; PWA install.
*Why: this is the minimum that produces one successful shared viewing.*

**v1.1** — recent-partners list into real friends/requests; scheduled watch parties with reminders; richer Po memory management UI; Android Capacitor build; per-room chat text lane; additional locales.
*Why: strengthens retention but not required for a first successful session.*

**v2** — verified provider plugins with true remote control where legally cleared; group watch >4; video chat; shared playlists; watch history; communities.
*Why: each depends on provider validation, scale work, or new domains.*

**Future** — AI recommendations, calendar integration, smart-TV and home automation, third-party plugin ecosystem, moderation and admin consoles, public rooms.

## 5. Room lifecycle

`Created → Waiting Room → Invites sent → Participants joining → Voice ready → Provider selected → Countdown → Watching → (Pause / Resume / Seek-announce / Reconnect) → Participant leaves → Room closed (by host, or auto after inactivity timeout)`

State rules: host is authoritative for countdown, provider and closure; a room with zero participants for the inactivity window auto-closes; closed rooms are read-only and appear in Recent for a limited period; host migration is **v1.1** (in v1, if the host leaves, the room closes with notice).

## 6. Po experience in v1

**Included:** voice input (press-to-talk) and text input into the same pipeline; intent understanding for — create room, invite people, start countdown, adjust countdown time, search/choose a provider, explain sync steps, announce audio/subtitle preference, leave/end room, open settings; clarification questions when a slot is missing; confirmation before irreversible or public actions; compliance explanations in plain language; graceful failure ("Po is unavailable, here's the manual way"); explicit opt-in preference memory with view/edit/delete.

**Reserved for later:** recommendations and taste modelling, conversation summaries, scheduling and calendar, multi-language conversation beyond the launch locales, proactive suggestions, accessibility narration of the whole app, smart-TV/home-automation tools, plugin-supplied tools.

## 7. Provider capability matrix (v1 honest state)

| Provider | v1 status | What v1 does |
|---|---|---|
| YouTube | **Supported** (public embed/API) | True synchronized playback where terms permit |
| Local media file | **Supported** | User's own file, synchronized locally |
| Netflix | **Manual Sync** | Countdown + deep link only; no control, no scraping |
| Prime Video | **Manual Sync** | Same |
| Disney+ Hotstar | **Manual Sync** | Same |
| SonyLIV | **Manual Sync** | Same |
| Any other named service | **Unverified** | Listed, manual sync only, labelled unverified |
| Anything requiring DRM/geo/subscription workaround | **Unavailable** | Refused with explanation |

Every non-YouTube entry starts Unverified until a recorded legal validation promotes it (Foundation §19). No provider is assumed controllable.

## 8. Voice chat (v1)

Join on entering the room or on demand; leave without leaving the room; mute/unmute with visible state and push-to-talk option; microphone and speaker selection; speaking indicator and a three-level connection-quality badge; automatic re-join on network recovery with a "reconnecting" state. Failure behaviour: voice never blocks the room — if it cannot start, the user sees why (permission, device, service) and continues with countdown and coordination intact.

## 9. Notifications (v1)

Invitation received / accepted / declined; countdown started; participant joined; participant left; room closed by host; voice disconnected; reconnect required; scheduled-party reminder (**v1.1**); system announcement. Channels: in-app centre + toast for all; email for invitations and (v1.1) scheduled reminders; push **future**. Each type is mutable per category in Settings.

## 10. Settings pages

Profile (name, avatar, email) · Language (UI language, preferred audio, preferred subtitles) · Appearance (theme, text size) · Voice (default mic/speaker, join-muted, push-to-talk) · Notifications (per-category toggles, channel choice) · Accessibility (reduced motion, high contrast, large text, captions preference) · Privacy (presence visibility, activity history, data export, account deletion) · Provider Preferences (favourites, region, default provider) · Po Preferences (enable/disable, voice or text only, saved memories with edit/export/delete) · Future AI Settings (reserved, hidden behind flag).

## 11. Error states

| Error | Cause | User message | Recovery |
|---|---|---|---|
| Internet lost | Connection dropped | "You're offline. We'll reconnect you." | Offline banner, cached room shell, auto-resync |
| Provider unsupported | Compliance verdict Unavailable | "We can't control playback on X — here's how to watch together anyway." | Offer manual-sync countdown |
| Invitation expired | Token past expiry/revoked | "This invite has expired." | Ask host for a new one |
| Authentication failed | Bad credentials / expired session | "We couldn't sign you in." | Retry, reset password, re-auth preserving destination |
| Voice failure | Token, device or service error | "Voice isn't connecting right now." | Retry, device picker, continue without voice |
| Sync failure | Drift beyond tolerance / missed cue | "You may be out of sync." | One-tap re-sync countdown |
| Countdown cancelled | Host cancelled or a participant dropped | "Host cancelled the countdown." | Host restarts when ready |
| User removed | Host removed the participant | "You were removed from this room." | Return Home; no auto re-entry |
| Permission denied | Not a member / not host | "You don't have permission to do that." | Explain who can, offer to ask the host |
| Microphone permission missing | Browser or OS block | "We need microphone access for voice." | Browser-specific instructions, continue without voice |
| Unsupported browser | Missing WebRTC/media APIs | "This browser can't run voice chat." | List supported browsers, allow no-voice mode |

## 12. Accessibility (minimum for v1)

Full keyboard operability with visible focus and skip links; semantic landmarks and ARIA for screen readers with live regions for countdown, join/leave and Po replies; captions preference surfaced and announced in-room; high-contrast theme and large-text scaling without layout breakage; `prefers-reduced-motion` respected (countdown degrades to a numeric counter); Po as a voice-accessible path to every core action; targets ≥44px; WCAG 2.1 AA as the acceptance bar.

## 13. Localization

Every string is a key from day one — no hardcoded copy anywhere, enforced at review. Launch with two locales (English plus one), runtime switching without reload, fallback chain to English, locale-aware dates/durations/numbers, RTL-ready layout, and pluralization support. Po prompts and error copy are localized assets too.

## 14. Analytics events (v1)

Auth: signed_up, signed_in, signed_out. Room: room_created, room_joined, room_left, room_closed, participant_removed. Invites: invitation_sent, invitation_accepted, invitation_declined, invite_link_copied. Sync: countdown_started, countdown_cancelled, countdown_completed, playback_started, playback_paused, playback_resumed, resync_requested, sync_lost, sync_restored. Voice: voice_joined, voice_left, voice_muted, voice_failed, voice_reconnected. Provider: provider_selected, provider_blocked_by_compliance. Po: po_activated, po_intent_recognized, po_clarification_requested, po_command_completed, po_command_failed, po_memory_saved. System: reconnect_started, reconnect_succeeded, error_shown, settings_changed, language_changed, pwa_installed. All routed through AnalyticsService; no PII in payloads.

## 15. Non-goals for v1.0

Video chat · screen sharing · communities and public/discoverable rooms · AI recommendations and taste modelling · calendar integration · watch-history intelligence · plugin ecosystem · text chat lane · rooms larger than four · host migration · payments/subscriptions · moderation and admin tooling · iOS and desktop builds · push notifications · any form of provider control that is not legally validated.

## 16. Definition of done for v1.0

Two people on different networks and different devices complete: sign up → create room → invite → join → voice → countdown → watch a full title in manual sync → recover from one deliberate disconnection → end room — with no unexplained error, every string localized, keyboard-and-screen-reader operable, and every provider action passing through ComplianceService.
