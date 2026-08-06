# C3 — State Management Principles

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0. Binding on all 13 Domain Engines and on the Experience Engine.

## C3.1 State classes

| Class | Definition | Store | Authority | Survives |
|---|---|---|---|---|
| Persistent | Durable business truth | Database via repositories | Owning Domain Engine | Everything |
| Realtime | Rapidly changing shared truth | Realtime transport + in-memory projection | Owning Domain Engine, one writer | Session only |
| Session | Per-user, per-tab runtime state | Memory | Feature layer | Until reload |
| Cached | A copy of persistent state held for speed | Query cache | Derived from persistent | Until invalidated |
| Derived | Computed from other state, never stored | Memory | Nobody — recompute | Never |
| Offline | Locally durable state pending sync | IndexedDB | Owning Domain Engine on reconciliation | Restart |

## C3.2 Universal rules

1. **Single writer.** Exactly one engine may write any piece of state. Cross-engine change happens by event, never by direct write.
2. **No duplicated authority.** If two places can produce a value, one is derived and must be recomputed, not stored.
3. **Derived state is never persisted.** Drift, elapsed time, readiness rollups, and occupancy counts are computed.
4. **Realtime is a projection, not the truth.** Persistent state reconciles realtime state on reconnect; realtime never overwrites persistent state without going through the owning engine.
5. **Cache invalidation is explicit.** Every mutation names the cache keys it invalidates. Time-based expiry alone is not acceptable for room, presence, or membership state.
6. **Offline writes are intents.** They are queued as intents with client timestamps, reconciled server-side, and may be rejected. The UI must be able to show a rejected intent.
7. **No vendor types in state contracts.** Supabase and LiveKit shapes stop at the Infrastructure boundary.
8. **Presentation holds no business state.** See [C2.3](./C2-experience-engine.md#c23-what-it-explicitly-does-not-own).

## C3.3 Ownership map

| State | Class | Owner |
|---|---|---|
| Room record, membership, capacity | Persistent | Room Engine |
| Room lifecycle status | Persistent | Room Engine |
| Domain event stream | Persistent (append-only) | Timeline Engine |
| Countdown target instant | Persistent + realtime | Watch Party Engine |
| Playback position and play state | Realtime | Sync Engine |
| Measured drift | Derived | Sync Engine |
| Clock offset | Session | Sync Engine |
| Presence and readiness | Realtime | Presence Engine |
| Voice participant state | Realtime | Voice Engine |
| Voice device preferences | Persistent | Voice Engine |
| Chat messages | Persistent + realtime | Chat Engine |
| Provider session/connection status | Persistent | Provider Engine |
| Capability tier resolution | Derived | Provider Engine |
| Notifications and badges | Persistent + realtime | Notification Engine |
| Friends, invites, blocks | Persistent | Community Engine |
| Po session, plan, memory | Persistent | AI/Po Engine |
| Analytics events | Persistent (append-only) | Analytics Engine |
| Moderation actions | Persistent | Moderation Engine |
| Pending invite destination | Offline | Room Engine |
| Theme, locale, motion preference | Persistent + session | Experience Engine (presentation preferences only) |

## C3.4 Conflict resolution

| Conflict | Rule |
|---|---|
| Two clients report different positions | Authoritative source wins: Tier A host adapter > server-recorded event > client estimate |
| Concurrent lifecycle transitions | Server-side transition guard; first valid transition wins, loser receives a rejection the UI must surface |
| Offline intent conflicts with server state | Server state wins; the intent is marked rejected and shown |
| Realtime message older than local projection | Discard by monotonic sequence, never by wall clock |
| Duplicate event sequence | Sequence allocation is server-side and collision-free |

## C3.5 Reconnection protocol

1. Re-establish transport.
2. Re-fetch persistent state for the room.
3. Rebuild the realtime projection from persistent state.
4. Replay missed events by sequence, not by timestamp.
5. Recompute all derived state.
6. Flush queued offline intents.
7. Announce restoration (P7).

Certification exercises this under the Temporary Disconnect, Host Disconnect, Member Disconnect, and Late Join profiles.
