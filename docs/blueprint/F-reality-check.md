# F — Reality Check

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0. Governed by ADR-014.

## F.1 The question

Can StreamFlow deliver a Hearo- or Rave-like experience — press play once, everyone's premium OTT playback moves together — legally and technically?

## F.2 The answer

**No, not for premium OTT, on any platform StreamFlow can ship to.** This is not an engineering gap that funding or effort closes. Four independent barriers each suffice:

1. **DRM.** Protected playback pipelines expose no controllable surface to third-party code.
2. **Platform sandboxing.** Browsers isolate cross-origin frames; mobile operating systems isolate app processes.
3. **Terms of service.** Provider terms forbid programmatic control, automation, and embedding by third parties.
4. **The remaining mechanisms are prohibited.** Screen capture, accessibility-service automation, and overlay injection would technically work in narrow cases and are excluded by P8 and ADR-014.

Every "OTT sync" product that appears to solve this is doing one of: syncing only free/embeddable sources, running a browser extension the user installs against provider terms, or synchronizing an instruction rather than playback. StreamFlow does the third, openly.

## F.3 What remains genuinely achievable

| Achievable | Mechanism | Tier |
|---|---|---|
| Frame-aligned shared playback | Adapter with verified control over an embeddable or local source | A |
| Position awareness without control | Observable media session | B |
| Shared start, shared voice, shared reactions, catch-up guidance | Deep link + synchronized countdown + realtime + voice | C |

## F.4 Where the felt experience actually comes from

The perception of "watching together" is produced overwhelmingly by **shared start, live voice, visible presence, and shared reactions** — not by sub-second frame alignment. A Tier C room with a tight countdown, instant voice, and honest catch-up feels closer to Hearo than a technically synchronized room with silent participants.

This is why the Experience Engine, the Voice Engine, and the Presence Engine carry as much product weight as the Sync Engine.

## F.5 What StreamFlow must therefore never claim

- "Sync Netflix" or any equivalent brand-level control claim.
- A shared scrubber, shared play state, or position readout on a Tier B or Tier C source.
- Any tier language keyed to a provider name rather than a certified capability tuple.

## F.6 Consequence for the roadmap

M1 ships an excellent Tier C experience and any Tier A capability that certifies. M2 deepens Tier A where it legitimately exists. M4 expands the matrix. No milestone contains work whose success depends on controlling premium OTT playback.
