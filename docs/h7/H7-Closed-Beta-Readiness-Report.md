# H7 — Closed Beta Readiness Report

Sprint: H7 — Closed Beta Readiness, Onboarding, Instrumentation, and Reliability
Mode: Build
Status: Complete
Preserves: H4, H5, H6 (no capability, provider, or governance semantics changed)
Not in scope and not performed: certification execution, certification evidence,
M1/M2 work, YouTube reinstatement, new OTT providers, public discovery.

---

## 1. Outcome

The complete first-time journey — landing, onboarding, room creation, invite,
join, content selection, countdown, provider handoff, watching, voice, chat,
recovery, exit, feedback — is now explained in plain language, guided by a
single next action at every point, and measured by a session-only funnel.

No behaviour of the watch party itself changed. H7 adds explanation,
instrumentation, and recovery guidance around the runtime built in H5 and made
social in H6.

---

## 2. Onboarding

`src/features/profiles/components/onboarding-wizard.tsx`

The wizard now opens with five explainer steps before the existing profile
setup:

| Step | Question it answers |
| --- | --- |
| What this is | Watch the same thing at the same time, together |
| Your subscription | You watch on your own account; StreamFlow does not supply content |
| How the handoff works | We line everyone up, then you press play in the service |
| Invites | A private link; only people with the link can join |
| Voice and volume | Voice needs microphone permission; volume is yours alone |

Rules enforced in the component:

- No engineering vocabulary. No "Tier C", "adapter", "capability class",
  "revision", "snapshot" appears in any onboarding string.
- Skip is disabled until the handoff step has been seen. A participant cannot
  reach a room without having been told that StreamFlow does not press play
  inside the provider.
- Each step emits `onboarding_step_viewed`; skipping emits `onboarding_skipped`
  with the step index reached, completion emits `onboarding_completed`.

---

## 3. Room activation

Domain: `src/domain/watch/room-activation.ts`
Hook: `src/features/theater/use-room-activation.ts`
UI: `src/features/theater/components/activation-panel.tsx`

`deriveActivationPlan` maps room facts to exactly one primary action and a
progress trail. Exactly one step is `current` at any time; the rest are `done`
or `todo`. This is asserted in the test suite.

| Situation | Primary action |
| --- | --- |
| Host, no one else | Invite someone |
| Host, guest present, no content | Choose what to watch |
| Host, content chosen, guests present | Start the countdown |
| Guest, no content yet | Wait for the host |
| Guest, launch-only content chosen | Open the service |
| Guest, service opened | I'm ready |
| Watching, voice available, not connected | Join voice |

Only one action is visually weighted. Secondary actions remain available but
are never styled as the primary.

---

## 4. Invite experience

`src/features/theater/components/invite-panel.tsx`

- Copy link with clipboard, and native share where `navigator.share` exists
  (feature-detected at call time, never assumed).
- Explicit success and failure states; a blocked clipboard falls back to a
  selectable link rather than silently failing.
- Live participant count against room capacity.
- A reminder appears when a host has been alone in a room past the invite
  threshold.
- Locked, expired, and full rooms are stated as such, with the reason, using
  the H6 invite resolution result rather than a guess.

---

## 5. Beta analytics

Domain: `src/domain/watch/beta-analytics.ts`
Store: `src/features/analytics/analytics-store.ts`

Session-only. A random session id is generated per tab, nothing is written to
storage, and nothing is transmitted. This is development instrumentation, not
certification evidence and not a durable analytics product.

Event families: acquisition, activation, engagement, reliability, completion.

Privacy is enforced by construction, not by discipline:

- Only primitives survive into `props`; objects and functions are dropped.
- A forbidden-key list removes message bodies, titles, URLs, emails, tokens,
  cookies, passwords, audio, and transcripts.
- Strings longer than 64 characters are dropped rather than truncated, so free
  text cannot leak through a long value.
- The context carries only coarse facts: role, provider id, sync mode,
  platform, device category, app version, room phase.

Deduplication: once-per-session events collapse on name; once-per-room events
collapse on room key, so a re-render or a reconnect cannot inflate the funnel.

---

## 6. Funnel metrics

Ten rates, computed in `computeFunnel`, all reported as `null` when the
denominator is zero — an unknown rate is never rendered as 0%.

1. Landing to room creation
2. Room creation to invite sent
3. Invite open to guest join
4. Rooms reaching a second participant
5. Guest join to content selection
6. Content selection to countdown
7. Countdown to watching
8. Watching to voice connection
9. Reconnect recovery
10. Repeat room creation

No target thresholds are stated. There is no beta data yet, so a target would
be invention.

---

## 7. Beta feedback

`src/domain/watch/beta-feedback.ts`, `src/features/theater/components/beta-feedback.tsx`

Two questions maximum, shown only after the participant has left the room or
the room has ended — never during watching.

- Question one: did this work? (yes / partly / no)
- Question two, only when not "yes": what went wrong, from a fixed category
  list (joining, content selection, sync, voice, chat, video, connection,
  something else), plus an optional short comment.

Dismissal is final for the session. Unknown categories are dropped; a
whitespace-only comment is stored as absence.

---

## 8. Reliability UX

`src/domain/watch/room-reliability.ts`, `src/features/theater/components/failure-notice.tsx`

Thirteen failure kinds each map to a plain-language description of what
happened and one concrete next action. The test suite asserts that every kind
has both strings present in the English bundle.

`invite_expired` is the only kind that reports the room as no longer active;
every other failure states that the party is still running, which prevents a
recoverable hiccup from reading as an ended session.

---

## 9. Beta admin view

Route: `src/routes/_authenticated.beta.tsx` (gated on the `admin` role via `RequireAuth`)
UI: `src/features/analytics/components/beta-dashboard.tsx`

Shows the ten funnel rates, room counts, reliability counters (voice
connections and failures, reconnects and recoveries, provider launches, manual
sync requests, failed starts), the feedback summary, and the last twenty
events. Session-scoped; no export, no persistence. A beta participant without
the admin role sees the standard permission-denied state.

---

## 10. Accessibility and mobile

- All new interactive elements are at least 44px in their smallest dimension.
- Every new control has a visible focus ring from the design-system tokens.
- Icon-only controls carry `aria-label`; progress uses `role="progressbar"`
  with min/max/now.
- The activation panel, invite panel, and feedback form are single-column on
  mobile with no horizontal overflow.
- All new motion respects the existing reduced-motion preference; nothing new
  animates unconditionally.

---

## 11. Localization

Approximately 90 keys added to `en` and mirrored in `hi-IN`, covering
onboarding explainers, activation steps, invite states, feedback, failure
guidance, and the beta dashboard. A test asserts that no H7 activation or
failure key is missing from the Hindi bundle.

---

## 12. Tests

`tests/product/h7-beta-readiness.test.ts` — 22 assertions across activation,
feedback, analytics, reliability guidance, and copy.

Full product suite: **68 pass, 0 fail** across three files (H5, H6, H7).

Regression coverage retained:

- A copy test asserts that no English string mentions YouTube.
- Provider capability classifications are untouched; no H7 test or component
  asserts control over a launch-only media plane.

Verification run this sprint: `bun test tests/product`, `bunx tsgo --noEmit`,
`bunx eslint src tests` (0 errors), `node scripts/check-architecture.mjs`
(passed — no vendor leakage outside Infrastructure).

---

## 13. Truthfulness statement

- StreamFlow still does not control playback inside any launch-only provider.
  Nothing added in H7 implies otherwise.
- No provider capability tier changed.
- No certification row was executed, and no certification evidence was written.
- All beta metrics are session-only and reset with the tab.
- No credentials, message bodies, titles, or personal data enter any event,
  log, or dashboard.

H7 is complete. Stopping here.
