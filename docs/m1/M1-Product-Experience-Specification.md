# M1 — Product Experience Specification

Sprint: M1.2. Mode: Documentation only. Constitution v2.0.0 frozen. M0, M0.5, M0.6, M1.0 and M1.1 frozen.

This document is the execution contract for the M1 user experience. It specifies behavior; it does not implement it, authorize it, or claim it exists. Every path, event, module, capability and certification row named here was verified against the repository. Anything unverifiable is marked **Unknown**, **Needs discovery**, or **None found**.

Status values used in this document are drawn only from the allowed vocabulary: Planned, Blocked, Needs discovery, Runnable now, Harness missing, Implementation missing, Registry mapping missing, Profile unavailable, Environment unavailable, Evidence writer missing, Blocked by dependency, Blocked by policy, Not applicable, Unknown, Partially complete, Already complete.

**No certification row in this document has passed.** No M1 evidence record exists in `tests/certification/evidence/`. Every M1 row remains absent from `docs/registry/required-evidence.json`.

---

## 0. Scope and boundary

The experience specified here is bounded by the frozen Launch Envelope in `docs/blueprint/D-milestone-roadmap.md` §M1: 2–8 private participants, web desktop first, Tier C watch experience, and only the existing lobby, room lifecycle, provider launcher, realtime, voice capability, authentication, profiles, friends, QR, countdown, notifications and branding.

Explicitly outside this document: premium OTT automation, screen-capture synchronization, accessibility-service automation, any playback control of a premium provider, TV platforms, public events, large-room conferencing, provider expansion, and any Tier A or Tier B claim. `docs/adr/ADR-014-synchronized-ott-playback-feasibility.md` is binding: StreamFlow never plays, pauses or seeks a premium OTT provider on the user's behalf, and the UI must never imply it can.

### Global traceability

| Item                              | Value                                                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authoritative sources             | `docs/blueprint/D-milestone-roadmap.md`, `docs/blueprint/B-capability-matrix.md`, `docs/blueprint/K-launch-certification.md`, `docs/adr/ADR-014-synchronized-ott-playback-feasibility.md`, `src/domain/events/event-catalog.ts` |
| Capability IDs in scope           | `CAP-OTT-WEBDESK` (Tier C, launch), `CAP-OTT-WEBMOB` (Tier C, launch)                                                                                                                                                           |
| Certification rows in scope       | CERT-ROOM-01..04, CERT-PRES-01..02, CERT-WP-01..02, CERT-SYNC-C-01..02, CERT-PROV-01..02, CERT-EXP-01..02                                                                                                                       |
| Owning engines                    | `ENG-ROOM`, `ENG-PRESENCE`, `ENG-WATCHPARTY`, `ENG-SYNC`, `ENG-VOICE`, `ENG-PROVIDER`, `ENG-NOTIFICATION`, `ENG-COMMUNITY`, `SUB-EXPERIENCE` (source: `docs/registry/engines.json`)                                             |
| Certification profiles referenced | PROF-01, PROF-02, PROF-04, PROF-05, PROF-07, PROF-09 (source: `tests/certification/profiles/certification-profiles.ts`)                                                                                                         |

### Cross-cutting experience rules

1. **Honesty over polish.** Any surface touching a Tier C provider states the tier and its consequence before the user commits. Validated by `CERT-PROV-01`.
2. **No fabricated sync.** No progress bar, scrubber, or "in sync" claim may be shown for a Tier C session unless it is derived from a value the user themselves reported. Validated by `CERT-SYNC-C-01`.
3. **Accessibility is a launch blocker.** WCAG 2.1 AA on every surface below; motion respects `prefers-reduced-motion`. Validated by `CERT-EXP-01`, `CERT-EXP-02`.
4. **Realtime is a projection, never a source of truth.** The server-side event stream in `src/domain/events/event-catalog.ts` is authoritative; the UI reconciles to it.
5. **Every failure state is recoverable in one action** without losing room context.

---

## 1. Splash

| Trace              | Value                                                                           |
| ------------------ | ------------------------------------------------------------------------------- |
| Source paths       | `src/app-shell/boot-screen.tsx`, `src/routes/__root.tsx`                        |
| Capability IDs     | Not applicable                                                                  |
| Certification rows | `CERT-EXP-02` (reduced motion)                                                  |
| Owning engine      | `SUB-EXPERIENCE`                                                                |
| Status             | Partially complete — boot screen exists; certification coverage Harness missing |

**Purpose.** Hold the first paint with a branded moment while session state resolves, so the user never sees an unauthenticated flash of the app.

**Entry conditions.** Cold start of any route. **Exit conditions.** Session resolution completes — authenticated users continue to their destination, unauthenticated users continue to Authentication.

**Primary CTA.** None; the splash is non-interactive. **Secondary actions.** None.

- _Loading state:_ the animated StreamFlow logo mark. Target dwell is short; an exact budget is **Unknown** (no splash metric found in `docs/registry/metrics.json`).
- _Empty state:_ Not applicable.
- _Degraded state:_ if session resolution exceeds a perceptible delay, the splash holds rather than flashing an intermediate screen.
- _Failure state:_ session resolution error routes to Authentication with a recoverable message, never to a dead end.
- _Recovery:_ reload returns to Splash; no state is lost because nothing has been entered.

**Accessibility.** The animation is decorative and must be hidden from assistive technology; a text alternative announces "Loading StreamFlow". Under `prefers-reduced-motion: reduce` the mark renders statically.

**Animations / transitions.** Logo animation, then a cross-fade into the destination surface. **Realtime updates.** None. **Latency perception.** The splash must feel like branding, not waiting.

---

## 2. Authentication

| Trace              | Value                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/routes/auth.tsx`, `auth.index.tsx`, `auth.sign-in.tsx`, `auth.sign-up.tsx`, `auth.callback.tsx`, `auth.verify-email.tsx`, `auth.forgot-password.tsx`, `auth.reset-password.tsx`, `auth.sign-out.tsx`, `src/features/auth`, `src/domain/auth` |
| Capability IDs     | Not applicable                                                                                                                                                                                                                                    |
| Certification rows | `CERT-ROOM-01` (invite resolution across sign-in), `CERT-EXP-01`                                                                                                                                                                                  |
| Owning engine      | Unknown — no identity engine listed in `docs/registry/engines.json`; ADR-016 governs the identity boundary                                                                                                                                        |
| Status             | Partially complete — surfaces exist; certification coverage Harness missing                                                                                                                                                                       |

**Purpose.** Get the user into a session in as few steps as possible, and never lose why they came.

**Entry conditions.** No session, or an explicit sign-out. **Exit conditions.** A session exists and the user is delivered to their _pending destination_ — the invite or room they originally opened — not to a generic landing screen.

**Primary CTA.** Continue (sign in or sign up, depending on the tab). **Secondary actions.** Switch between sign in and sign up, forgot password, resend verification.

- _Loading:_ the CTA enters a busy state; fields stay readable and are not cleared.
- _Empty:_ first-run sign-up shows the value proposition, not an empty form alone.
- _Degraded:_ if a social provider is unavailable, email/password remains offered without a full-page error.
- _Failure:_ invalid credentials, expired link, and weak password each produce a distinct human-readable message. Never surface a raw backend error code.
- _Recovery:_ every failure keeps the pending destination intact so the user still lands in the intended room after a retry.

**Interaction**

```
User action: opens an invite link while signed out
→ System reaction: the destination is persisted, then Authentication renders
→ Realtime events: none
→ Expected UI update: the auth screen states which room the user is joining
→ Fallback behavior: if the destination cannot be persisted, the user is sent Home with the invite code recoverable by manual entry
→ Certification required: CERT-ROOM-01
```

**Failure states.** _Expired link:_ user sees a plain explanation and a one-tap way to request a new one; the system routes to a recovery surface; what is logged is **Unknown** (no auth telemetry schema verified); validated by `CERT-ROOM-01` only insofar as destination survival is concerned.

**Accessibility.** Labelled inputs, visible focus, errors associated with their field and announced by a live region, password strength conveyed as text and not by color alone.

**Animations.** Tab cross-fade only; suppressed under reduced motion.

---

## 3. Home

| Trace              | Value                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/routes/_authenticated.home.tsx`, `src/features/home/components/home-screen.tsx`, `home-hero.tsx`, `service-shelf.tsx`, `join-by-code-card.tsx`, `live-parties-section.tsx`, `room-list-section.tsx`, `continue-watching-card.tsx`, `friends-rail.tsx`, `home-skeleton.tsx`, `home-placeholders.tsx`, `src/domain/rooms/home-read-model.ts` |
| Capability IDs     | `CAP-OTT-WEBDESK` (via service selection)                                                                                                                                                                                                                                                                                                       |
| Certification rows | `CERT-PROV-01`, `CERT-EXP-01`, `CERT-EXP-02`                                                                                                                                                                                                                                                                                                    |
| Owning engines     | `ENG-ROOM`, `ENG-PROVIDER`, `SUB-EXPERIENCE`                                                                                                                                                                                                                                                                                                    |
| Status             | Partially complete — surfaces exist; certification coverage Harness missing                                                                                                                                                                                                                                                                     |

**Purpose.** Answer one question — _what do you want to watch, and with whom_ — and make starting a room the shortest path on the screen.

**Entry conditions.** Authenticated session. **Exit conditions.** The user creates a room, joins one by code, opens an invite, or navigates to Friends, Notifications or Account.

**Primary CTA.** Choose a service and start a room. **Secondary actions.** Join by code, resume a live party, open a friend, open notifications, quick settings.

- _Loading:_ skeletons matching the final layout (`home-skeleton.tsx`) — never a spinner over an empty page, so perceived latency stays low.
- _Empty:_ no friends and no rooms yet shows an invitation-first placeholder (`home-placeholders.tsx`), not a blank shelf.
- _Degraded:_ if the live-parties or friends query fails, that rail alone degrades to a retry affordance; service selection stays usable.
- _Failure:_ a total read failure shows one recoverable error surface with retry; the user is never signed out as a side effect.
- _Recovery:_ retry re-runs only the failed read.

**Realtime updates.** Live-party presence and friend availability update in place; a row appearing or leaving must not shift the primary CTA under the user's cursor.

**Interaction**

```
User action: selects a streaming service tile
→ System reaction: the room setup path opens with that provider preselected
→ Realtime events: none yet; RoomProviderSelected is emitted at room creation
→ Expected UI update: the tile shows selection, and the Tier C consequence is stated before commit
→ Fallback behavior: if provider classification cannot be resolved, the tile is presented without any sync claim
→ Certification required: CERT-PROV-01
```

**Accessibility.** The shelf is a keyboard-navigable list with accessible names per service; brand color is never the only carrier of state; the hero contains the single `h1`.

**Animations.** Tile hover/press feedback and rail entrance; all suppressed under reduced motion (`CERT-EXP-02`).

---

## 4. Friends

| Trace              | Value                                                                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/routes/_authenticated.people.tsx`, `_authenticated.people.$profileId.tsx`, `src/features/social/use-social.ts`, `use-user-search.ts`, `use-public-profile.ts`, `components/friend-lists.tsx`, `friend-actions.tsx`, `person-row.tsx`, `user-search-panel.tsx`, `recent-partners-rail.tsx`, `src/domain/social` |
| Capability IDs     | Not applicable                                                                                                                                                                                                                                                                                                      |
| Certification rows | Needs discovery — no friends-specific row is in the M1 set; `CERT-EXP-01` applies as a launch surface                                                                                                                                                                                                               |
| Owning engine      | `ENG-COMMUNITY`                                                                                                                                                                                                                                                                                                     |
| Status             | Partially complete                                                                                                                                                                                                                                                                                                  |

**Purpose.** Make the second person easy to find, so a room is never empty.

**Entry conditions.** Authenticated session. **Exit conditions.** The user invites someone to a room, opens a profile, or returns Home.

**Primary CTA.** Invite to room. **Secondary actions.** Search, send/accept/decline a friend request, remove, block, open a public profile.

- _Loading:_ row-shaped skeletons; search shows an inline busy state, not a blocking overlay.
- _Empty:_ no friends yet leads directly to search and to link sharing.
- _Degraded:_ search failure keeps existing lists visible and marks only search as retryable.
- _Failure:_ a rejected action (for example a blocked relationship) explains the outcome in plain language without disclosing the other party's state beyond what policy allows.
- _Recovery:_ single retry per failed action; list state is preserved.

**Realtime.** Friend request and acceptance events drive the Notifications badge (see §5).

**Accessibility.** Each person row exposes one accessible name and clearly labelled actions; destructive actions (remove, block) require confirmation and are announced.

---

## 5. Notifications

| Trace              | Value                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source paths       | `src/features/notifications/notification-provider.tsx`, `use-notification-badges.ts`, `components/notification-badge.tsx`, `src/routes/_authenticated.invites.tsx` |
| Capability IDs     | Not applicable                                                                                                                                                     |
| Certification rows | Needs discovery — `CERT-NOTIF-01` exists in `docs/blueprint/K-launch-certification.md` but is not in the frozen M1 in-scope row set for this sprint                |
| Owning engine      | `ENG-NOTIFICATION`                                                                                                                                                 |
| Status             | Partially complete                                                                                                                                                 |

**Purpose.** Tell the user that someone is waiting for them, accurately and without noise.

**Entry conditions.** Authenticated session; badges are ambient across the app. **Exit conditions.** The user opens the referenced invite, friend request, or room.

**Primary CTA.** Open the item that generated the notification. **Secondary actions.** Dismiss, mark all read.

- _Loading:_ badges render only once counts resolve; never flash a wrong number.
- _Empty:_ no badge is shown at zero — an empty badge is a bug, not an empty state.
- _Degraded:_ if the count stream drops, the last known count is retained and refreshed on reconnect rather than reset to zero.
- _Failure:_ delivery failure is silent to the user but must not leave a stale positive count after the item is consumed.
- _Recovery:_ counts reconcile on reconnect from the authoritative read, not from accumulated deltas.

**Realtime event specification**

| Event                             | Publisher                     | Consumers                                  | Ordering          | Retry                   | Idempotency         | User-visible effect                   |
| --------------------------------- | ----------------------------- | ------------------------------------------ | ----------------- | ----------------------- | ------------------- | ------------------------------------- |
| `InviteCreated`                   | Room host action, server-side | Invitee's notification badge, invites list | Per-room sequence | Reconnect-and-reconcile | Keyed by `inviteId` | Badge increments; invite appears      |
| `InviteAccepted`                  | Invitee                       | Host, room member list                     | Per-room sequence | Reconnect-and-reconcile | Keyed by `inviteId` | Host sees acceptance; badge clears    |
| `InviteDeclined`                  | Invitee                       | Host                                       | Per-room sequence | Reconnect-and-reconcile | Keyed by `inviteId` | Host sees decline                     |
| `InviteExpired` / `InviteRevoked` | Server / host                 | Invitee                                    | Per-room sequence | Reconnect-and-reconcile | Keyed by `inviteId` | Invite disappears with an explanation |

Source for all four: `src/domain/events/event-catalog.ts` §4. Exact retry and idempotency mechanics of the transport are **Needs discovery** beyond the publisher/subscriber pair in `src/infrastructure/supabase/events/`.

---

## 6. Create Room

| Trace              | Value                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/domain/rooms/room-setup-service.ts`, `src/features/waiting-room/components/room-setup-card.tsx`, `countdown-duration-field.tsx`, `src/domain/rooms/room-flow-service.ts` |
| Capability IDs     | `CAP-OTT-WEBDESK`                                                                                                                                                             |
| Certification rows | `CERT-PROV-01`, and indirectly `CERT-ROOM-02`                                                                                                                                 |
| Owning engines     | `ENG-ROOM`, `ENG-PROVIDER`                                                                                                                                                    |
| Status             | Partially complete                                                                                                                                                            |

**Purpose.** Turn "I want to watch this" into a shareable room in one step.

**Entry conditions.** Authenticated session, optionally with a provider preselected from Home. **Exit conditions.** A room exists, the creator is host, and the Lobby is showing with an invite ready to share.

**Primary CTA.** Create room. **Secondary actions.** Change provider, set room name, set countdown duration, cancel.

- _Loading:_ the CTA is busy and idempotent — a second press must not create a second room.
- _Empty:_ Not applicable.
- _Degraded:_ if provider classification is unresolved, room creation proceeds but the room is presented with no sync claim at all.
- _Failure:_ creation failure returns the user to the form with all input retained and a plain-language reason.
- _Recovery:_ retry from the same form; no orphaned room is left behind.

**Interaction**

```
User action: presses Create room
→ System reaction: room is created, host membership is established, invite code is minted
→ Realtime events: RoomCreated, then RoomProviderSelected, then MemberJoined (host)
→ Expected UI update: Lobby appears with the room code and share affordances already present
→ Fallback behavior: on failure the form is restored intact; no partial room is shown
→ Certification required: CERT-PROV-01 (disclosure before commit); CERT-ROOM-02 (host visible with correct role)
```

**Realtime event specification**

| Event                  | Publisher | Consumers                     | Ordering                          | Retry                   | Idempotency                      | User-visible effect                 |
| ---------------------- | --------- | ----------------------------- | --------------------------------- | ----------------------- | -------------------------------- | ----------------------------------- |
| `RoomCreated`          | Host      | Host client, host's room list | First event of the room aggregate | Reconnect-and-reconcile | Keyed by `roomId`                | Lobby opens                         |
| `RoomProviderSelected` | Host      | All members                   | After `RoomCreated`               | Reconnect-and-reconcile | Keyed by `roomId` + `providerId` | Provider and tier shown to everyone |

**Accessibility.** Form fields are labelled; the countdown duration field has an accessible numeric description; the created room code is selectable text, not an image.

---

## 7. Join Room

| Trace              | Value                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source paths       | `src/routes/join.$code.tsx`, `src/features/home/components/join-by-code-card.tsx`, `src/domain/rooms/room-flow-service.ts`, `src/features/invitations/pending-invite.ts` |
| Capability IDs     | Not applicable                                                                                                                                                           |
| Certification rows | `CERT-ROOM-01`, `CERT-ROOM-02`, `CERT-ROOM-03`                                                                                                                           |
| Owning engine      | `ENG-ROOM`                                                                                                                                                               |
| Status             | Partially complete                                                                                                                                                       |

**Purpose.** Get an invited person into the right room, whatever state they arrive in.

**Entry conditions.** An invite link, a QR scan, or a manually typed code. The user may be signed out, signed in, already a member, or arriving after the room is full. **Exit conditions.** The user is in the Lobby, or is told precisely why they are not.

**Primary CTA.** Join. **Secondary actions.** Copy the code, go Home, request a new invite.

- _Loading:_ the join surface names the room before membership resolves so the user knows they are in the right place.
- _Empty:_ Not applicable.
- _Degraded:_ if the room is reachable but its provider is unresolved, join still succeeds and the provider panel degrades.
- _Failure states:_
  - _Unknown or malformed code_ — user sees "this code doesn't match a room"; system performs no membership write; what is logged is **Unknown**; validated by `CERT-ROOM-01`.
  - _Expired or revoked invite_ — user sees an explanation plus a way to ask the host again; validated by `CERT-ROOM-01`.
  - _Room at capacity_ — the ninth joiner sees a clear, localized refusal, never an error code; validated by `CERT-ROOM-03`.
  - _Already a member_ — the user is returned into the room, not refused. This is a re-open, not a duplicate join.
- _Recovery:_ every failure offers exactly one next action that does not lose the code.

**Interaction**

```
User action: opens an invite link
→ System reaction: code is resolved, membership is created or re-opened, capacity is enforced server-side
→ Realtime events: InviteAccepted, MemberJoined
→ Expected UI update: the Lobby renders with the new member visible to every peer within a perceptible instant
→ Fallback behavior: refusal states render as human sentences with one recovery action
→ Certification required: CERT-ROOM-01, CERT-ROOM-02, CERT-ROOM-03
```

**Accessibility.** The code field accepts paste, tolerates case and spacing, and announces validation results; refusal messages are in a live region.

---

## 8. QR Join

| Trace              | Value                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/features/waiting-room/components/invite-friends.tsx`, `src/features/invitations/components/invite-share-card.tsx` |
| Capability IDs     | Not applicable                                                                                                         |
| Certification rows | `CERT-ROOM-01` (QR resolves to the same destination as a link)                                                         |
| Owning engine      | `ENG-ROOM`                                                                                                             |
| Status             | Partially complete — QR display exists in the repository; in-app QR _scanning_ — **None found**                        |

**Purpose.** Let someone in the same room physically join in seconds, without typing.

**Entry conditions.** A host or member is showing the invite. **Exit conditions.** The scanning device opens the same destination as the invite link and proceeds through §7.

**Primary CTA.** Show QR. **Secondary actions.** Copy link, copy code, share.

- _Loading:_ the code renders only when the invite is confirmed; never show a placeholder QR.
- _Degraded:_ if QR rendering fails, the link and the short code remain available as equal-status options.
- _Failure:_ an expired invite must invalidate the displayed QR rather than resolve to a dead page.
- _Recovery:_ regenerate or re-share the invite.

**Accessibility.** The QR carries a text alternative containing the room code, and the code is always presented in readable text next to it — the QR is never the only way to join.

---

## 9. Invite Flow

| Trace              | Value                                                                                                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/features/invitations/pending-invite.ts`, `components/invite-card.tsx`, `invite-share-card.tsx`, `invite-history-list.tsx`, `src/routes/_authenticated.invites.tsx`, `src/features/waiting-room/components/invite-friends.tsx`, `invite-summary.tsx` |
| Capability IDs     | Not applicable                                                                                                                                                                                                                                           |
| Certification rows | `CERT-ROOM-01`                                                                                                                                                                                                                                           |
| Owning engines     | `ENG-ROOM`, `ENG-NOTIFICATION`, `ENG-COMMUNITY`                                                                                                                                                                                                          |
| Status             | Partially complete                                                                                                                                                                                                                                       |

**Purpose.** Make asking someone to watch feel like sending a message, not configuring a meeting.

**Entry conditions.** The user is host or member of a room. **Exit conditions.** An invite exists and has been delivered by at least one channel; or it is declined, expired, or revoked.

**Primary CTA.** Share invite. **Secondary actions.** Invite a friend directly, copy link, show QR, revoke, view invite history.

- _Loading:_ share affordances stay enabled optimistically once the code exists.
- _Empty:_ an empty invite history explains that invites will appear here after the first share.
- _Degraded:_ if the clipboard is unavailable — a known Safari constraint — the link is presented as selectable text with an explicit instruction, never a silent no-op.
- _Failure:_ revoke or delivery failure states the outcome and leaves the invite in its previous, accurate state.
- _Recovery:_ re-share or regenerate.

**Realtime.** `InviteCreated`, `InviteDelivered`, `InviteAccepted`, `InviteDeclined`, `InviteExpired`, `InviteRevoked` — publisher, consumers, ordering, retry and idempotency as tabulated in §5.

---

## 10. Lobby

| Trace              | Value                                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source paths       | `src/routes/_authenticated.rooms.$roomId.tsx`, `src/features/waiting-room/components/waiting-room-layout.tsx`, `room-info-card.tsx`, `room-summary-card.tsx`, `room-details.tsx`, `member-list.tsx`, `member-strip.tsx`, `member-card.tsx` |
| Capability IDs     | `CAP-OTT-WEBDESK`                                                                                                                                                                                                                          |
| Certification rows | `CERT-ROOM-02`, `CERT-PRES-01`, `CERT-PROV-01`                                                                                                                                                                                             |
| Owning engines     | `ENG-ROOM`, `ENG-PRESENCE`, `SUB-EXPERIENCE`                                                                                                                                                                                               |
| Status             | Partially complete                                                                                                                                                                                                                         |

**Purpose.** The gathering place: who is here, what we are watching, and what happens next.

**Entry conditions.** Membership in a room that has not started. **Exit conditions.** Countdown begins, or the user leaves, or the room ends.

**Primary CTA.** For the host, start the watch party; for a member, mark ready. **Secondary actions.** Invite, change provider (host), open voice, leave.

- _Loading:_ the room shell renders immediately with member placeholders; the room's identity is never withheld behind a spinner.
- _Empty:_ a room of one leads with the invite action as the visual center of the screen.
- _Degraded:_ if presence is stale, members are shown with an explicit "reconnecting" treatment rather than silently disappearing.
- _Failure:_ loss of the room read shows a single retry that preserves membership.
- _Recovery:_ on reconnect the member list is rebuilt from the authoritative projection, not patched from missed deltas.

**Realtime updates.** `MemberJoined`, `MemberLeft`, `MemberRemoved`, `MemberReadyChanged`, `RoomStatusChanged`, `RoomProviderSelected` (source: `src/domain/events/event-catalog.ts` §3). Ordering is per-room sequence; retry is reconnect-and-reconcile; idempotency is keyed by `roomId` plus `profileId`.

**Latency perception.** A peer joining should feel immediate to everyone already present. The numeric budget lives in `docs/blueprint/C4` as invite-to-join and ready propagation; the measured M1 value is **unmeasured** — no M1 evidence record exists.

**Accessibility.** The member list is a labelled list with per-member status conveyed in text; stage changes are announced politely, not assertively.

---

## 11. Waiting Room (progressive stages)

| Trace              | Value                                                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/features/waiting-room/components/waiting-room.tsx`, `room-stage.tsx`, `room-setup-card.tsx`, `ready-confirmation-card.tsx`, `playback-readiness-panel.tsx`, `countdown-panel.tsx`, `now-watching-card.tsx` |
| Capability IDs     | `CAP-OTT-WEBDESK`                                                                                                                                                                                               |
| Certification rows | `CERT-WP-02` (stage progression), `CERT-PRES-01`                                                                                                                                                                |
| Owning engines     | `ENG-WATCHPARTY`, `ENG-ROOM`, `ENG-PRESENCE`                                                                                                                                                                    |
| Status             | Partially complete                                                                                                                                                                                              |

**Purpose.** Reveal only the step that matters right now, so the room never looks like a control panel.

**Entry conditions.** Membership in a room. **Exit conditions.** The room reaches the watching stage, or ends.

**Stages.** Invite → Waiting → Ready → Countdown → Watching. Each stage shows one primary action; earlier stages collapse into summaries rather than remaining expanded.

**Primary CTA per stage.** Invite → share; Waiting → mark ready; Ready → host starts; Countdown → none (the countdown is the action); Watching → open the provider.

- _Loading:_ stage transitions never blank the screen; the outgoing stage collapses as the incoming one expands.
- _Degraded:_ if a member's readiness cannot be confirmed, the room shows them as not-ready rather than assuming ready.
- _Failure:_ a stage advance that fails server-side must roll the UI back to the true stage, never leave a client ahead of the room.
- _Recovery:_ on reconnect the client adopts the room's authoritative stage even if that means moving backwards.

**Interaction**

```
User action: member marks themselves ready
→ System reaction: readiness is recorded against the room aggregate
→ Realtime events: MemberReadyChanged
→ Expected UI update: every participant sees the same readiness state; the host's start action enables when the room's policy is satisfied
→ Fallback behavior: on write failure the toggle reverts with an explanation; no optimistic lie persists
→ Certification required: CERT-PRES-01, CERT-WP-02
```

**Accessibility.** Stage changes are announced; the current stage is programmatically identifiable; no stage relies on animation to be understood.

---

## 12. Presence

| Trace              | Value                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/domain/rooms/presence-coordinator.ts`, `src/domain/rooms/presence.types.ts`, `src/features/waiting-room/use-room-presence.ts`, `components/presence-indicator.tsx`, `src/infrastructure/supabase/events/supabase-realtime-event-subscriber.ts` |
| Capability IDs     | Not applicable                                                                                                                                                                                                                                      |
| Certification rows | `CERT-PRES-01`, `CERT-PRES-02`                                                                                                                                                                                                                      |
| Owning engine      | `ENG-PRESENCE`                                                                                                                                                                                                                                      |
| Status             | Partially complete — modules exist; disconnect-latency observability is Needs discovery                                                                                                                                                             |

**Purpose.** The lobby must always tell the truth about who is actually there.

**Entry conditions.** Any room surface. **Exit conditions.** The user leaves the room.

- _Degraded:_ a member whose transport is unstable is shown as reconnecting, distinctly from present and from absent.
- _Failure:_ a dropped member is marked absent within the K threshold of ≤ 10 s. The measured M1 latency is **unmeasured**; `CERT-PRES-02` must record a measurement, never an asserted pass.
- _Recovery:_ presence rebuilds from the authoritative projection on reconnect.

**Realtime event specification**

| Event                | Publisher                | Consumers   | Ordering          | Retry                   | Idempotency            | User-visible effect                   |
| -------------------- | ------------------------ | ----------- | ----------------- | ----------------------- | ---------------------- | ------------------------------------- |
| `MemberJoined`       | Joining member           | All members | Per-room sequence | Reconnect-and-reconcile | `roomId` + `profileId` | Member appears with identity and role |
| `MemberLeft`         | Leaving member or server | All members | Per-room sequence | Reconnect-and-reconcile | `roomId` + `profileId` | Member removed with a reason          |
| `MemberReadyChanged` | Member                   | All members | Per-room sequence | Reconnect-and-reconcile | `roomId` + `profileId` | Readiness parity across clients       |

Transport-level retry and idempotency guarantees beyond the publisher/subscriber pair are **Needs discovery**.

**Accessibility.** Presence is never color-only; each state has a text label and an accessible name.

---

## 13. Countdown

| Trace              | Value                                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source paths       | `src/domain/countdown/countdown-runtime.ts`, `src/domain/rooms/countdown-coordinator.ts`, `src/features/waiting-room/components/countdown-panel.tsx`, `countdown-overlay.tsx`, `countdown-duration-field.tsx`, `src/domain/sync/clock-sync-engine.ts`, `server-time-source.ts` |
| Capability IDs     | `CAP-OTT-WEBDESK`                                                                                                                                                                                                                                                              |
| Certification rows | `CERT-WP-01`                                                                                                                                                                                                                                                                   |
| Owning engines     | `ENG-WATCHPARTY`, `ENG-SYNC`                                                                                                                                                                                                                                                   |
| Status             | Partially complete — runtime exists; countdown-zero instrumentation for certification is Needs discovery                                                                                                                                                                       |

**Purpose.** This is the product's whole promise in Tier C: everyone presses play at the same moment.

**Entry conditions.** The host starts the party from the Ready stage. **Exit conditions.** The countdown fires, or the host cancels.

**Primary CTA.** None during the countdown — deliberately. **Secondary actions.** Cancel (host only).

- _Loading:_ Not applicable; the countdown begins from a scheduled server target, not from client start time.
- _Degraded:_ a client with poor clock quality still counts down, but the room must not claim tighter alignment than its clock-sync quality band supports.
- _Failure:_ if the countdown cannot be scheduled, the room stays at the Ready stage with an explanation; no client counts down alone.
- _Recovery:_ a client that reconnects mid-countdown rejoins the same target time rather than restarting its own timer.

**Interaction**

```
User action: host starts the watch party
→ System reaction: a countdown target time is scheduled against server time
→ Realtime events: CountdownScheduled, then CountdownFired; CountdownCancelled on abort
→ Expected UI update: an identical countdown overlay on every client, converging on the same instant
→ Fallback behavior: a client that cannot resolve server time shows the countdown without a precision claim
→ Certification required: CERT-WP-01 (measured spread against the C4 budget)
```

**Realtime event specification**

| Event                | Publisher          | Consumers   | Ordering                   | Retry                                                           | Idempotency                             | User-visible effect             |
| -------------------- | ------------------ | ----------- | -------------------------- | --------------------------------------------------------------- | --------------------------------------- | ------------------------------- |
| `CountdownScheduled` | Host               | All members | Precedes `CountdownFired`  | Reconnect-and-reconcile to the target time                      | Keyed by `roomId` + `countdownTargetAt` | Overlay appears everywhere      |
| `CountdownFired`     | Server-side timing | All members | After `CountdownScheduled` | Target time is absolute, so a late client still lands correctly | Keyed by `roomId`                       | Overlay resolves to "go"        |
| `CountdownCancelled` | Host               | All members | Terminates the sequence    | Reconnect-and-reconcile                                         | Keyed by `roomId`                       | Overlay dismisses with a reason |

**Accessibility.** The countdown is announced at meaningful intervals rather than every tick; under reduced motion the numerals change without scaling or pulsing; the final moment is conveyed in text, not by animation alone.

**Latency perception.** The spread across clients is the single most important perceived-quality metric in M1. Its measured value is **unmeasured**.

---

## 14. Voice

| Trace              | Value                                                                                                                                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/features/voice/use-voice-session.ts`, `use-voice-devices.ts`, `voice-device-preferences.ts`, `components/voice-dock.tsx`, `voice-controls.tsx`, `voice-panel.tsx`, `voice-indicator.tsx`, `voice-status.tsx`, `voice-settings-section.tsx`, `src/infrastructure/voice` |
| Capability IDs     | Not applicable                                                                                                                                                                                                                                                              |
| Certification rows | `CERT-VOICE-01`, `CERT-VOICE-02` — **Blocked by dependency** on PROF-08                                                                                                                                                                                                     |
| Owning engine      | `ENG-VOICE`                                                                                                                                                                                                                                                                 |
| Status             | Blocked by dependency — PROF-08 is Profile unavailable in `tests/certification/profiles/certification-profiles.ts` (no media-server credentials); tracked as `DEBT-005` at milestone M3 in `docs/debt/debt-register.json`                                                   |

**Purpose.** Watching together is talking together; voice is the social layer that Tier C cannot get from playback.

**Entry conditions.** Membership in a room. **Exit conditions.** The user leaves voice or leaves the room.

**Primary CTA.** Join voice. **Secondary actions.** Mute, deafen, select input/output device, leave voice.

- _Loading:_ connecting state on the dock; controls are visible but disabled, never absent.
- _Empty:_ if nobody else is in voice, the dock says so instead of appearing broken.
- _Degraded:_ declining quality is shown per participant, and the dock never claims connected when it is reconnecting.
- _Failure:_ microphone permission denial yields a clear, recoverable state with instructions — the room remains fully usable without voice. This is the behavior `CERT-VOICE-02` exists to validate; it cannot execute today.
- _Recovery:_ rejoin voice in one action after transport loss.

**Realtime event specification.** `VoiceSessionStarted`, `VoiceParticipantJoined`, `VoiceParticipantLeft`, `VoiceParticipantMuteChanged`, `VoiceQualityChanged`, `VoiceSessionEnded` (source: `src/domain/events/event-catalog.ts` §6). Publisher is the participant or the voice session; consumers are all room members; ordering is per-session; idempotency is keyed by `voiceSessionId` + `profileId`. Per the catalog, these events never carry a token or audio data.

**Certification note.** Voice behavior is specified here so implementation has a contract, but voice **cannot be certified in M1**. Both rows must record `blocked` naming PROF-08 — never `fail`, and never `pass`.

**Accessibility.** Every control has a text label and a keyboard path; speaking indicators are not the only cue; mute state is announced on change.

---

## 15. Provider Launcher

| Trace              | Value                                                                                                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/domain/providers/provider-launcher.ts`, `provider-tier.ts`, `src/features/waiting-room/components/provider-launch-panel.tsx`, `provider-session-card.tsx`, `manual-play-reminder.tsx`, `src/features/providers`, `src/infrastructure/providers` |
| Capability IDs     | `CAP-OTT-WEBDESK`, `CAP-OTT-WEBMOB`                                                                                                                                                                                                                  |
| Certification rows | `CERT-SYNC-C-01`, `CERT-SYNC-C-02`, `CERT-PROV-01`, `CERT-PROV-02`                                                                                                                                                                                   |
| Owning engine      | `ENG-PROVIDER`                                                                                                                                                                                                                                       |
| Status             | Partially complete                                                                                                                                                                                                                                   |

**Purpose.** Hand the user off to their own provider account, honestly, at the right moment.

**Entry conditions.** The room has a provider selected and has reached the watching stage. **Exit conditions.** The provider opens in the user's own session; StreamFlow remains available alongside it.

**Primary CTA.** Open the provider. **Secondary actions.** Copy the title, mark "I've started", switch provider (host), view what sync mode this means.

- _Loading:_ the launch affordance is available as soon as the provider is resolved.
- _Empty:_ no provider selected shows a selection prompt, not an inert button.
- _Degraded:_ if the deep link cannot be constructed, the user is given the provider's entry point plus the title to find manually — a one-step, announced, reversible fallback. This is what `CERT-PROV-02` validates.
- _Failure:_ a provider that is unavailable in the user's region is disclosed before commitment, not after.
- _Recovery:_ re-launch at any time; the room state is unaffected by a failed launch.

**Interaction**

```
User action: presses Open Netflix
→ System reaction: the deep link opens in the user's own authenticated provider session
→ Realtime events: PlaybackSessionStarted for the room's session record
→ Expected UI update: the room switches to the Tier C HUD; no playback controls are rendered
→ Fallback behavior: if the deep link fails, the provider's entry point plus the exact title are offered, announced as a fallback
→ Certification required: CERT-SYNC-C-01, CERT-PROV-01, CERT-PROV-02
```

**ADR-014 constraint.** StreamFlow never automates, controls, captures, casts, or observes the provider's player. The launcher opens a link; the human presses play. Any UI element implying otherwise is a defect that `CERT-SYNC-C-01` must catch.

**Accessibility.** The launch action states that it opens an external service; tier and consequence are text, not iconography alone.

---

## 16. Tier C Watch HUD

| Trace              | Value                                                                                                                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/features/watch-party/components/watch-party-hud.tsx`, `watch-party-screen.tsx`, `watch-party-status.tsx`, `shared-elapsed-timer.tsx`, `reaction-burst.tsx`, `use-elapsed-time.ts`, `src/features/waiting-room/components/room-sync-card.tsx`, `sync-health-card.tsx`, `now-watching-card.tsx` |
| Capability IDs     | `CAP-OTT-WEBDESK`, `CAP-OTT-WEBMOB`                                                                                                                                                                                                                                                                |
| Certification rows | `CERT-SYNC-C-01`, `CERT-SYNC-C-02`, `CERT-EXP-02`                                                                                                                                                                                                                                                  |
| Owning engines     | `ENG-WATCHPARTY`, `ENG-SYNC`, `SUB-EXPERIENCE`                                                                                                                                                                                                                                                     |
| Status             | Partially complete                                                                                                                                                                                                                                                                                 |

**Purpose.** Keep the group present to each other while the video plays somewhere StreamFlow cannot see.

**Entry conditions.** The countdown has fired and the provider has been launched. **Exit conditions.** The user leaves, or the session ends.

**Primary CTA.** None — the HUD is ambient by design. **Secondary actions.** React, open voice, open the catch-up assistant, leave.

- _Loading:_ the HUD appears with the countdown's resolution, not after a separate wait.
- _Empty:_ Not applicable.
- _Degraded:_ if realtime drops, the HUD shows a reconnecting treatment and freezes claims rather than inventing them.
- _Failure:_ the HUD never fails into a blank overlay; the room identity and the leave action always remain reachable.
- _Recovery:_ reconnect restores reactions and presence from the authoritative projection.

**What the HUD may and may not show.** It may show a _shared elapsed timer_ — time since the countdown fired, which StreamFlow genuinely knows — plus presence, voice state and reactions. It may **not** show a scrubber, a provider position, a play/pause control, or an "in sync" claim, because for Tier C none of those are knowable. `CERT-SYNC-C-01` exists to assert this absence.

**Accessibility.** Reactions are announced sparingly and can be muted; the elapsed timer is readable text; reaction animation is suppressed under reduced motion (`CERT-EXP-02`).

---

## 17. Catch-up Assistant

| Trace              | Value                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/features/watch-party/components/catch-up-sheet.tsx`, `src/domain/playback/playback-drift-policy.ts`, `src/domain/sync/drift-engine.ts`                                     |
| Capability IDs     | `CAP-OTT-WEBDESK`                                                                                                                                                               |
| Certification rows | Needs discovery for M1 — `CERT-WP-03` (catch-up flow) is a roadmap M2 row and is **not** in the M1 in-scope set; `CERT-SYNC-C-01` governs the honesty of what this sheet claims |
| Owning engines     | `ENG-WATCHPARTY`, `ENG-SYNC`                                                                                                                                                    |
| Status             | Partially complete — the sheet exists; its M1 certification row is Not applicable                                                                                               |

**Purpose.** When someone falls behind, help them fix it themselves, using a number only they can supply.

**Entry conditions.** A user in a Tier C session suspects they are out of step. **Exit conditions.** The user closes the sheet, having been told how far off they are and in which direction.

**Primary CTA.** Compare — the user enters the timestamp they see in their own player. **Secondary actions.** Close, re-compare.

- _Empty:_ before any input, the sheet explains why StreamFlow must ask instead of reading the position itself.
- _Degraded:_ if the room's reference elapsed time is unavailable, comparison is disabled with an explanation rather than producing a wrong number.
- _Failure:_ an unparseable timestamp is rejected inline without discarding the room context.
- _Recovery:_ re-enter and re-compare freely; nothing is written to the room.

**Interaction**

```
User action: enters the timestamp shown in their provider player
→ System reaction: the value is compared against the room's shared elapsed reference
→ Realtime events: none — this is a local, user-supplied comparison
→ Expected UI update: in sync, or behind/ahead by N seconds, with plain-language advice
→ Fallback behavior: if the reference is unavailable, comparison is disabled and said so
→ Certification required: CERT-SYNC-C-01 (the sheet must not imply StreamFlow can read the player)
```

**ADR-014 constraint.** The advice is instructional only. StreamFlow must never offer to perform the seek.

**Accessibility.** The result is text in a live region; direction (behind/ahead) is never conveyed by color alone.

---

## 18. Leave Room

| Trace              | Value                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Source paths       | `src/features/waiting-room/components/membership-actions.tsx`, `src/domain/rooms/room-flow-service.ts` |
| Capability IDs     | Not applicable                                                                                         |
| Certification rows | `CERT-ROOM-04`                                                                                         |
| Owning engine      | `ENG-ROOM`                                                                                             |
| Status             | Partially complete                                                                                     |

**Purpose.** Leaving should be obvious, immediate, and never accidental.

**Entry conditions.** Membership in a room. **Exit conditions.** The user is out of the room and voice, and is returned Home.

**Primary CTA.** Leave room. **Secondary actions.** Cancel the confirmation.

- _Degraded:_ if the leave write fails, the user is still detached from the client-side session and the discrepancy reconciles server-side; the user is never trapped.
- _Failure:_ a host leaving is a distinct case — the room must resolve to a defined state. The exact host-departure policy in M1 is **Needs discovery**; host _transfer_ authority is a roadmap M2 concern and out of M1 scope.
- _Recovery:_ rejoin via §19.

**Interaction**

```
User action: confirms Leave room
→ System reaction: membership is ended and voice is disconnected
→ Realtime events: MemberLeft, VoiceParticipantLeft; RoomEnded if the room resolves to ended
→ Expected UI update: remaining members see the departure immediately; the leaver lands Home
→ Fallback behavior: on write failure the client still detaches and reconciles on next read
→ Certification required: CERT-ROOM-04
```

**Accessibility.** Leaving requires an explicit confirmation; the confirmation is focus-trapped and escapable.

---

## 19. Rejoin

| Trace              | Value                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Source paths       | `src/domain/rooms/room-flow-service.ts`, `src/routes/join.$code.tsx`                                |
| Capability IDs     | Not applicable                                                                                      |
| Certification rows | `CERT-ROOM-04`                                                                                      |
| Owning engine      | `ENG-ROOM`                                                                                          |
| Status             | Partially complete — the grace-window duration and policy are **Unknown**; no constant was verified |

**Purpose.** A closed tab should not cost someone their evening.

**Entry conditions.** A former member returns within the grace window. **Exit conditions.** The user is back in the room at the room's current stage.

**Primary CTA.** Rejoin. **Secondary actions.** Go Home.

- _Degraded:_ rejoining a room already in the watching stage places the user directly at the HUD, with the catch-up assistant one action away.
- _Failure:_ if the grace window has passed or the room has ended, the user is told plainly and offered Home; the invite code is not silently reused.
- _Recovery:_ a fresh invite from the host.

**Interaction**

```
User action: reopens the room link after disconnecting
→ System reaction: membership is restored and the current room stage is adopted
→ Realtime events: MemberJoined
→ Expected UI update: the user lands at the room's true stage, not at the beginning
→ Fallback behavior: expired grace yields a clear message plus one recovery action
→ Certification required: CERT-ROOM-04 (rejoin within grace restores room context)
```

---

## 20. Disconnect Recovery

| Trace              | Value                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/infrastructure/supabase/events/supabase-realtime-event-subscriber.ts`, `supabase-realtime-event-publisher.ts`, `src/features/waiting-room/components/sync-health-card.tsx`, `src/domain/sync/room-sync-coordinator.ts`, `clock-sync-engine.ts` |
| Capability IDs     | Not applicable                                                                                                                                                                                                                                      |
| Certification rows | `CERT-PRES-02`, `CERT-ROOM-04`                                                                                                                                                                                                                      |
| Owning engines     | `ENG-PRESENCE`, `ENG-SYNC`, `ENG-ROOM`                                                                                                                                                                                                              |
| Status             | Partially complete                                                                                                                                                                                                                                  |

**Purpose.** A network blip should be a visible, self-healing moment — not a mystery.

**Entry conditions.** Realtime transport loss while in a room. **Exit conditions.** The transport reconnects and the projection is rebuilt, or the user leaves.

- _Degraded:_ the room enters an explicit reconnecting treatment. Stale values are frozen and labelled, never presented as current.
- _Failure:_ what the user sees is a plain "reconnecting" state with the room identity intact; what the system does is re-subscribe and rebuild the projection from the authoritative read; what gets logged is **Unknown** — no client telemetry schema was verified; validated by `CERT-PRES-02` from the peers' side, and `CERT-ROOM-04` from the returning user's side.
- _Recovery:_ rebuild-not-patch. Missed deltas are never replayed blindly; the client reconciles to the room's current projection.

**Realtime guarantees.** Ordering is per-room sequence. Retry policy at the transport level is **Needs discovery** beyond the subscriber module. Idempotency is keyed by aggregate plus sequence, per `src/domain/events/event.types.ts`. Reconnect must produce no duplicate member rows and no lost events — the property `CERT-RT-01`/`CERT-RT-02` exist to prove, both of which are **outside** the M1 in-scope set for this sprint.

**Accessibility.** Connection state changes are announced politely; the reconnecting indicator is not animation-only.

---

## 21. Session End

| Trace              | Value                                                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source paths       | `src/domain/rooms/room-flow-service.ts`, `src/domain/events/event-catalog.ts` (`RoomEnded`, `PlaybackEnded`, `VoiceSessionEnded`), `src/features/waiting-room/components/room-summary-card.tsx` |
| Capability IDs     | Not applicable                                                                                                                                                                                  |
| Certification rows | Needs discovery — no M1 in-scope row governs session end directly; `CERT-ROOM-04` covers the rejoin boundary                                                                                    |
| Owning engines     | `ENG-ROOM`, `ENG-WATCHPARTY`                                                                                                                                                                    |
| Status             | Partially complete                                                                                                                                                                              |

**Purpose.** End the evening cleanly and make the next one easy to start.

**Entry conditions.** The host ends the room, or the room resolves to ended. **Exit conditions.** All members are returned Home with the session closed.

**Primary CTA.** Done. **Secondary actions.** Watch again with the same people, add a participant as a friend.

- _Degraded:_ if the summary cannot be built, the user is still returned Home cleanly.
- _Failure:_ an incomplete end must not leave a phantom live party on anyone's Home. Reconciliation on next read is required.
- _Recovery:_ start a new room from Home.

**Realtime.** `RoomEnded`, `PlaybackEnded`, `VoiceSessionEnded` — publisher is the host or the server; consumers are all members; ordering places `RoomEnded` last for the room aggregate; idempotency is keyed by `roomId`; the user-visible effect is a graceful return Home.

**Accessibility.** The end-of-session transition is announced; focus moves to a sensible landing element, not to the top of an unrelated page.

---

## M1 Experience Walkthrough

Aarav wants to watch a film with Meera tonight. They live four hours apart.

He opens StreamFlow. The logo settles for a moment and Home appears, already asking the only question that matters: _what do you want to watch today?_ A shelf of familiar streaming brands sits under the question. He taps Netflix. Before anything else happens, StreamFlow tells him plainly what tonight will be like: it will open Netflix in his own account, and it will count everyone in together — it will not press play for him. He is fine with that; it is what he expected, and it is the truth.

He names the room and creates it. The lobby appears with a short code and a QR square, and one obvious thing to do: invite someone. Meera's face is in his friends rail, so he taps her. On her phone, a badge appears within a heartbeat.

She taps it. She is signed out, so StreamFlow asks her to sign in — but it tells her, right there on the sign-in screen, that she is joining Aarav's room. She signs in, and lands exactly where she was headed. No re-pasting a code, no wondering whether it worked.

The lobby is now two people. Aarav sees Meera arrive; Meera sees Aarav already there, marked as host. She taps _I'm ready_. The stage advances for both of them at once — the invite card folds into a summary, and the room now shows one thing: Aarav's start button.

He presses it. A countdown fills both their screens, driven by the same target instant rather than by two independent timers. Five. Four. Three. Meera hears Aarav laugh — they joined voice a minute ago and never thought about it again. Two. One.

Netflix opens on both their machines, each in their own account, and they each press play on the film. StreamFlow steps back: the room becomes a quiet HUD at the edge of the screen, showing a shared timer counting up from the moment they started, their two faces, their voice state, and a reaction button. There is no scrubber, no fake progress bar, no green "in sync" badge — because StreamFlow genuinely cannot see inside Netflix, and it refuses to pretend otherwise.

Twenty minutes in, Meera's Wi-Fi drops. Her HUD says so honestly — _reconnecting_ — and keeps the room in front of her rather than throwing her out. Aarav sees her marked as away within a few seconds. When her connection returns, she is back in the room at the stage it is actually at, not at the beginning.

But her player kept buffering while his did not, and she can hear that she is behind. She taps _Catch up_. StreamFlow asks her something only she can answer: what timestamp does your player show? She types 21:14. StreamFlow compares it to the room's shared elapsed time and tells her she is 38 seconds behind, and suggests she skip forward by that much. She does it herself, in Netflix, in one gesture. StreamFlow never touched her player — it just did the arithmetic and got out of the way.

The credits roll. Aarav ends the room. Both of them get a clean close: a short summary of what they watched together, and a one-tap way to do it again next week. They are back Home, and the room is gone from both their screens.

Nothing in that evening required either of them to understand tiers, sync modes, or clock offsets. That is the entire point of this specification.

---

## Implementation Guidance

Guidance only. No implementation has started, none is authorized, and nothing below adds scope beyond the frozen Launch Envelope. Work-package definitions live in `docs/m1/M1-Backlog.md`; sequencing lives in `docs/m1/M1-Dependency-Graph.md`.

| WP   | Package                             | Sections of this document it must implement against                                                                        | Status                                                                       |
| ---- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| WP1  | Certification harness extension     | All sections, indirectly — every "Certification required" line needs a spec and an evidence writer before it can be proven | Needs discovery                                                              |
| WP2  | Registry and checklist wiring       | All sections — the rows named throughout must become mandatory registry entries before any M1 seal is trustworthy          | Registry mapping missing                                                     |
| WP3  | Invite resolution hardening         | §2 Authentication, §7 Join Room, §8 QR Join, §9 Invite Flow                                                                | Harness missing                                                              |
| WP4  | Join, capacity, leave/rejoin        | §7 Join Room, §10 Lobby, §18 Leave Room, §19 Rejoin                                                                        | Harness missing                                                              |
| WP5  | Presence accuracy                   | §10 Lobby, §12 Presence, §20 Disconnect Recovery                                                                           | Harness missing                                                              |
| WP6  | Watch-party stage and countdown     | §11 Waiting Room, §13 Countdown                                                                                            | Harness missing                                                              |
| WP7  | Tier C coordination correctness     | §15 Provider Launcher, §16 Tier C Watch HUD, §17 Catch-up Assistant                                                        | Harness missing                                                              |
| WP8  | Web-mobile certification surface    | §15 and §16 on a mobile viewport                                                                                           | Environment unavailable — no `web-mobile` Playwright project: **None found** |
| WP9  | Provider disclosure and fallback    | §3 Home, §6 Create Room, §15 Provider Launcher                                                                             | Harness missing                                                              |
| WP10 | Experience: a11y and reduced motion | Accessibility and animation notes in every section                                                                         | Partially complete                                                           |

**Open items carried from this specification** (recorded, not designed): host-departure policy in §18 is Needs discovery; the rejoin grace window in §19 is Unknown; client telemetry/logging schema referenced in §2 and §20 is Unknown; transport-level retry semantics in §5, §12 and §20 are Needs discovery; splash dwell budget in §1 is Unknown. Each must be resolved by inspection during implementation, or by a numbered ADR if it turns out to require an architectural decision.

---

**Human approval is still required before any M1 implementation begins.** This document specifies behavior only. M1 implementation was not performed. M1 remains pending explicit human authorization.
