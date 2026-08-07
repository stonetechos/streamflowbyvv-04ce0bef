# H6 — Social Watch-Party, Voice, Chat, Moderation, and Reliability Report

Status: Complete
Mode: Build
Preserves: H4 (multi-OTT selection), H5 (room runtime) — unchanged in behaviour
Out of scope and not performed: certification runs, certification evidence, M1/M2 work,
YouTube reintroduction, provider capability re-classification

---

## 1. What H6 changed

H5 made the room run. H6 makes it a place people can actually be in together, and
survive real-world conditions: a dropped connection, a backgrounded tab, a host who
needs to quiet someone, a message that failed to send.

Every state added in this sprint is observed, never inferred:

- "Watching" requires an actual watch phase on the one media plane we control.
- Voice states come from the voice transport, or the panel says voice is unavailable.
- Chat lines show `sending` / `sent` / `failed` from delivery, never optimistic "sent".
- The recovery banner clears only after a fresh room snapshot has been adopted.

## 2. Domain additions (pure, testable)

| Module | Responsibility |
| --- | --- |
| `src/domain/watch/room-governance.ts` | Seat roles, permission matrix, room settings read/write, invite resolution ordering, presence classification, recovery phases, stale-snapshot rule |
| `src/domain/watch/room-governance-service.ts` | The one place a moderation act becomes durable; authorizes before it writes |
| `src/domain/watch/room-analytics.ts` | Privacy-safe product events and a session-only dev metrics recorder |

Seat vocabulary: `host`, `co_host`, `participant`, `muted`, `removed`.
Only the host may close a room; hosts and co-hosts may mute, remove, lock, control
chat, and control the countdown; nobody may moderate a room that has ended.

Room settings live in the existing room `metadata` bag under a `governance` key —
no schema change, no migration. They are private by default: invite live, chat on,
room unlocked, no approval queue.

Invite resolution has exactly one ordering, shared by every join surface:
`invalid → revoked (removed) → already_joined → room_closed → revoked (link) →
expired → room_locked → room_full → valid`. A revoked link is never reported as
"room full".

## 3. Feature and presentation additions

| File | Role |
| --- | --- |
| `src/features/theater/use-room-governance.ts` | Carries settings and authorized moderation calls to the UI |
| `src/features/theater/use-connection-recovery.ts` | Online/offline and visibility → one honest recovery phase |
| `src/features/theater/use-product-analytics.ts` | Emits privacy-safe events; session-only metrics |
| `src/features/voice/use-microphone-permission.ts` | Permission asked only on a deliberate tap |
| `src/features/theater/components/voice-room-panel.tsx` | Voice states, mute, device pickers, honest unavailability |
| `src/features/theater/components/host-moderation.tsx` | Lock, chat, invite, countdown, close (with confirmation) |
| `src/features/theater/components/connection-banner.tsx` | Offline / suspended / recovering / recovered |
| `src/features/theater/components/chat-panel.tsx` | Timestamps, delivery status, retry and discard |
| `src/features/theater/components/participant-rail.tsx` | Presence, in-voice, per-member mute and remove |

The room snapshot now also carries `governance` and each member's `isMutedByHost`, so
guests see a lock or a chat freeze the moment the host applies it — the same shared
state path H3/H4 established for media selection.

## 4. Voice

Voice uses the existing LiveKit-backed transport behind `VoiceAdapter`; no vendor type
reaches the feature layer. When no transport grant is configured the panel reports
"Voice isn't available in this room yet. Chat still works." rather than rendering dead
controls. Microphone permission is requested only when a person taps **Join voice**, and
a denial is reported as a denial with recovery guidance.

Local mute affects only the tapping participant. A host mute is a separate, visible
state (`muted_by_host`) that blocks joining voice and is labelled as such.

No speaking indicator is rendered for other participants: the room shows "In voice" for
observed connections only.

## 5. Reliability

- Backgrounding → `suspended`; the tab is not reported as watching.
- Network loss → `offline`; on return the room refetches and shows `recovering` until a
  snapshot lands, then `recovered`.
- Stale snapshots are rejected by revision (`shouldAdoptSnapshot`), consistent with the
  H5 revision-guarded command path.
- Chat failures are retryable and never silently dropped.

## 6. Verification

- `bun test tests/product` — 43 pass, 0 fail (24 H5 rows preserved, 19 new H6 rows in
  `tests/product/h6-social-governance.test.ts`).
- `tsgo --noEmit` — clean.
- `eslint .` — 0 errors (pre-existing react-refresh warnings only).
- Localization: 56 new keys added to both `en` and `hi-IN`.
- Touch targets on all new interactive controls are `min-h-11` (44px).

## 7. Explicitly not done

No certification was run and no evidence was written. No provider capability
classification changed. YouTube remains absent from the product registry (asserted by
the preserved H5 test). No schema migration was required.
