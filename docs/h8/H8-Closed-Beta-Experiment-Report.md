# H8 — Closed Beta Experiment, Activation Measurement, and Monetization Discovery

**Sprint:** H8
**Mode:** Build
**Status:** Complete
**Preserves:** H4, H5, H6, H7 (no behaviour removed or reclassified)

---

## 1. Scope and boundaries observed

| Boundary | Observed |
| --- | --- |
| No certification run, no certification evidence | Yes — nothing under `tests/certification/` or `docs/registry/` was touched |
| No M1 or M2 work | Yes |
| No new OTT providers, no YouTube | Yes — provider registry unchanged; `youtube` survives only in unrelated code comments |
| No change to launch-only classifications | Yes — `playbackControlMode` values are untouched |
| No social feed | Yes |
| No paid billing | Yes — `BILLING_ENABLED` is a frozen `false` and there is no payment path in the tree |

This sprint added measurement and research surfaces. It changed no watch-party
capability, no sync semantics, and no provider truthfulness rule.

---

## 2. Primary activation event

The single event that defines a successful beta session is

```
room_reached_watching_with_host_and_guest
```

It is emitted only when **all five** requirements hold simultaneously
(`src/domain/watch/beta-activation.ts`):

| Requirement | Meaning |
| --- | --- |
| `host_present` | a host is in the room |
| `guest_present` | at least one participant other than the host joined |
| `valid_media` | a title is selected and its `validity` is not `invalid` |
| `countdown_completed` | the shared countdown actually reached zero; a cancelled countdown does not count |
| `phase_watching` | the derived shared `RoomPhase` is `watching` |

The event fires **exactly once per room**, enforced in the tracker rather than
at the call site, so a re-render, a reconnect, or a second observer cannot
inflate the number. The room screen *observes* facts; it never asserts
activation.

Deliberately **not** activation: a solo host room, a room where the countdown
was started and cancelled, a room with no chosen title, and a room still in the
lobby.

---

## 3. Cohort design

`src/domain/watch/beta-cohort.ts` and `src/features/analytics/beta-access.ts`.

- **Access modes:** `disabled` (default), `allowlist`, `invite_only`. With no
  configuration present the beta is closed and nobody is admitted — an
  accidentally open beta is the worse failure.
- **Keys** are opaque tokens compared and discarded. No key is stored, logged,
  attached to an event, or associated with a person.
- **Cohort identifier** is a random per-tab value. It carries `platform`,
  `appVersion`, `inviteSource`, `betaFlag`, `internal`, activation status and
  feedback status — and nothing else. A test asserts the absence of
  `email`, `name`, `userId`, `profileId`, `ip`, and `key`.
- **Invite sources:** `share_sheet`, `direct_link`, `qr_code`, `allowlist`,
  `internal`, `unknown`. Read from a coarse `?from=` marker; an unrecognised
  value degrades to `direct_link` rather than being recorded verbatim.
- **Internal testers** are flagged so team sessions can be excluded from any
  reading of the funnel.

---

## 4. Activation funnel and reliability

Extended in `src/domain/watch/beta-analytics.ts`.

New counted events: `countdown_completed`,
`room_reached_watching_with_host_and_guest`, `chat_send_failed`,
`beta_access_granted`, `beta_access_denied`.

New derived measures:

| Measure | Definition |
| --- | --- |
| `activationRate` | activated rooms ÷ rooms created |
| `inviteOpenSuccess` | guests joined ÷ invites opened |
| `guestJoinSuccess` | rooms with a guest ÷ rooms created |
| `countdownCompletion` | countdowns completed ÷ countdowns started |
| `reconnectRecovery` | reconnects recovered ÷ reconnects started |
| `voiceConnectionSuccess` | voice connected ÷ voice join requests |
| `chatSendFailure` | chat failures ÷ chat messages sent |
| `providerLaunchAction` | launch clicks ÷ activated rooms |
| median time to first guest / selection → watching / session length | from the per-room timeline |

**Every rate is `null`, not `0`, until its denominator exists.** The dashboard
renders `—`. A beta with no data must not be able to display a false floor.

---

## 5. Beta dashboard

`src/features/analytics/components/beta-dashboard.tsx`, reached at `/beta`,
gated by the `admin` role, unchanged from H7.

Sections: cohorts (with live filters over platform, app version, service, sync
mode, invite source), activation, funnel, reliability, engagement, feedback,
pricing research, interview queue, recent events.

Properties held:

- Session-only. No query, no persistence, no export. Closing the tab discards
  everything, which is intended: this is a development instrument, not product
  analytics and not certification evidence.
- The only identifier displayed anywhere is the anonymous cohort id.
- Written feedback is collapsed behind an explicit action.
- An empty state explains how to produce data instead of showing zeros.

---

## 6. Participant-facing surfaces

**Session summary** (`session-summary-card.tsx`) — after the room ends: time
together, people, service, whether you started watching together, whether chat
and talking were available, and reconnect count only when it happened. It uses
the `room.recap.*` namespace and no experiment vocabulary; a test asserts the
words *cohort*, *activation*, *funnel*, *telemetry*, and *conversion* never
appear on any participant-facing key.

**Pricing research** (`research-panel.tsx`) — at most two optional questions
about at most three concepts, shown only after a session has ended, never
inside a live room. Skipping is a valid answer and is recorded as such.

The panel's own copy states that nothing is for sale and that everything in use
today stays free. This is enforced structurally, not editorially:
`CORE_MVP_CAPABILITIES` lists what the MVP promises (private rooms, invite
links, text chat, manual coordination, voice, presence, reconnect), and
`validateConcepts()` fails if any researched concept overlaps it. A test runs
that check.

---

## 7. Reliability work

- Reconnect attempts are now counted per room and surfaced to the participant
  in their own summary, rather than only in developer counters.
- The countdown-completion signal distinguishes *reached zero* from *was
  started*, so a cancelled countdown can no longer be read as a completed one
  anywhere in the funnel.
- Chat send failures are a first-class counted outcome with their own rate.
- Invite-blocked states (`locked`, `expired`) continue to be reported from room
  state rather than inferred.

---

## 8. Interview queue

`src/domain/watch/interview-queue.ts`. Admin-only. Prioritises anonymous
cohorts by signal, highest first: invited someone but never watched (100),
repeated reconnect failures (80), watched once and did not return (60), used
manual sync (40), used voice (30), activated (10). A cohort with no signal is
not queued. Seven interview questions ship in both locales.

The ordering is a product judgement: someone who tried to bring a friend along
and never got to watching tells us more about the central failure than someone
for whom everything worked.

---

## 9. Verification

```
bun test tests/product   →  98 pass, 0 fail (4 files)
tsgo --noEmit            →  clean
```

H8 adds 30 assertions across access control, activation rules, rate
arithmetic, research safety, session summary, interview prioritisation, and
locale parity. The H4–H7 suites pass unchanged.

Locale parity: `en` and `hi-IN` carry identical key sets, asserted by test.

---

## 10. What H8 did not do

- No billing, checkout, entitlement, or paywall of any kind.
- No persistence of analytics, feedback, or research beyond the tab session.
- No change to what the product claims about controlling OTT playback.
- No certification activity of any kind.
