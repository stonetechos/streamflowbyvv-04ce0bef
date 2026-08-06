# C5 — Product Principles as Architecture Constraints

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

These principles are immutable. They are not aspirations; each one is an architecture constraint that the certification gate in [K](./K-launch-certification.md) can fail a release against. Changing a principle requires a numbered ADR that supersedes this document.

---

## P1 — Never fake synchronization

**Constraint.** No surface may display, imply, or animate a synchronized state that the system has not verified.

Binds: Sync Engine, Watch Party Engine, Provider Engine, Experience Engine.

Implications:
- Tier B and Tier C rooms never render a shared scrubber or a shared play state as if it were authoritative.
- A position readout with no observation behind it is a defect, not a placeholder.
- Countdown is honest: it synchronizes an *instruction*, not playback.

Certification: every Tier B/C room certification asserts the absence of authoritative-looking playback affordances.

---

## P2 — Always disclose provider limitations

**Constraint.** A source cannot be offered without its capability tier and its practical consequence stated in user language, before the user commits.

Binds: Provider Engine, Experience Engine, Room Engine.

Implications:
- Disclosure text lives with the capability row in [B](./B-capability-matrix.md), not in component code.
- Removing disclosure to reduce visual noise is prohibited.

Certification: `provider disclosure` matrix row, blocking.

---

## P3 — People over content

**Constraint.** When a design decision trades participant awareness against content real estate, participant awareness wins.

Binds: Watch Party Engine, Presence Engine, Voice Engine, Experience Engine.

Implications: presence and voice state remain visible in every room state, including degraded ones.

---

## P4 — The room is the product

**Constraint.** Room continuity outranks any single feature. No feature may make the room unrecoverable.

Binds: Room Engine, Timeline Engine, Presence Engine.

Implications:
- A failed voice connection, a failed provider launch, or a failed adapter never ends a room.
- Host disconnect degrades to a recoverable state, never to destruction, within the grace window.

Certification: Host Disconnect and Member Disconnect profiles, blocking.

---

## P5 — Minimize friction

**Constraint.** The path from invite link to being in the room is the most protected path in the product. Any change lengthening it requires an ADR.

Binds: Room Engine, Notification Engine, Experience Engine.

Implications: invite context survives sign-in, install, and cold start.

Certification: `invite resolution` and `room join` rows, blocking.

---

## P6 — Voice should feel effortless

**Constraint.** Voice is join-by-default-when-enabled, with a visible, one-tap recovery whenever it degrades. Permission denial is a designed state, never a dead end.

Binds: Voice Engine, Experience Engine.

Certification: `voice join`, `voice denial fallback`, blocking.

---

## P7 — Be transparent about degraded modes

**Constraint.** Every degradation is announced on the surface where it changes what the user can do, and its restoration is announced too.

Binds: every engine.

Certification: `degraded-mode handling`, blocking.

---

## P8 — Trust over feature breadth

**Constraint.** No feature ships that requires bypassing DRM, scraping, credential storage, screen-capture automation, accessibility-service automation, region evasion, or provider terms violation. ADR-014 governs.

Binds: Provider Engine, Sync Engine, AI/Po Engine, Moderation Engine.

Implications: Po may never plan an action the Compliance Service rejects, and the Tool Registry may not expose one.

Certification: compliance review is a blocking gate at Release Candidate and Production.

---

## P9 — Portability is a product property

**Constraint.** No vendor type (Supabase, LiveKit, any LLM SDK) may appear in a Domain Engine contract. Vendor coupling stays in Infrastructure.

Binds: all engines.

Certification: `arch:check` conformance is a blocking M0 gate.

---

## Principle-to-engine binding table

| Principle | Room | Timeline | Watch Party | Sync | Voice | Chat | Presence | Provider | Notification | Community | AI/Po | Analytics | Moderation | Experience |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | | ● | ● | ● | | | | ● | | | | | | ● |
| P2 | ● | | ● | | | | | ● | | | ● | | | ● |
| P3 | | | ● | | ● | ● | ● | | | | | | | ● |
| P4 | ● | ● | ● | ● | | | ● | | | | | | | |
| P5 | ● | | | | | | | | ● | ● | | | | ● |
| P6 | | | | | ● | | ● | | | | | | | ● |
| P7 | ● | ● | ● | ● | ● | ● | ● | ● | ● | | ● | | | ● |
| P8 | | | | ● | | | | ● | | ● | ● | ● | ● | |
| P9 | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
