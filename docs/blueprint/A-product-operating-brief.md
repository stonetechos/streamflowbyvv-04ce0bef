# A — Product Operating Brief

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

## A.1 Thesis

People do not miss watching content. They miss watching it *with someone*. StreamFlow's job is to remove the coordination cost of watching together across distance: getting everyone into the same place, starting at the same moment, hearing each other, and recovering gracefully when one person's network drops.

StreamFlow is a **coordination and presence product** that happens to sit next to video. It is not a video platform. It stores no media, proxies no streams, and holds no provider credentials.

## A.2 Users

| Type | Description | Primary need |
|---|---|---|
| Host | Creates the room, chooses the source, drives the start | Get everyone in and started with minimal fuss |
| Member | Accepts an invite and joins | Understand instantly what to do next |
| Returning group | 2–8 people who watch together repeatedly | Reduce setup to near zero |
| Guest | Opens an invite link without an account | Preview enough to decide to join (ADR-010) |

## A.3 Sync tier model — capability-based, never provider-based

This section is normative and overrides any provider-name shorthand appearing in earlier documents.

A **capability** is the tuple:

```text
source · adapter · platform · version
```

- **source** — the content origin (e.g. an embeddable player surface, a user-supplied local file, a cloud-drive file, a provider app).
- **adapter** — the concrete StreamFlow adapter implementation that talks to that source.
- **platform** — web desktop, web mobile, Android, iOS, TV, desktop app.
- **version** — the adapter version and the minimum verified host/runtime version.

### Tier A — Verified controllable playback

Tier A means StreamFlow has **verified** that it can issue play, pause, and seek against that exact capability tuple and observe the result, and that doing so is permitted.

Rules:

1. A provider name never automatically qualifies for Tier A.
2. The same provider may be Tier A on one platform and Tier B or Tier C on another. Tier is a property of the tuple, never of the brand.
3. Every Tier A capability **must** have a corresponding certification record in [K — Launch Certification](./K-launch-certification.md). If the record is absent, expired, or failing, the capability is not Tier A and the runtime must degrade it.
4. Tier A status is revoked automatically when the adapter version or the verified platform/version range changes, until re-certified.

### Tier B — Observed / assisted

A real media session exists and is observable (position, play state) but not controllable, or controllable only in ways StreamFlow is not permitted to use. StreamFlow reports drift and offers catch-up guidance. It never issues commands.

### Tier C — Coordinated manual

No observation, no control. StreamFlow provides a deep link, a shared countdown, voice, and explicit manual-sync guidance. This is the default tier and the honest baseline for premium OTT under ADR-014.

### Disclosure rule

Every surface that offers a source states the tier in user language before the user commits. Silence is a defect. See [C5 — Product Principles](./C5-product-principles.md).

## A.4 Room lifecycle summary

```text
draft → open → ready → starting → active → paused → ended → archived
```

- **draft** — host is choosing a source; not yet invitable.
- **open** — invitable; members join the lobby.
- **ready** — all present members have signalled readiness.
- **starting** — countdown running; a bounded, cancellable window.
- **active** — the watch party is live; Tier A drives playback, Tier B observes, Tier C coordinates.
- **paused** — Tier A only; a member-initiated or host-initiated hold.
- **ended** — host ended or the last member left; state retained for rejoin grace.
- **archived** — beyond retention grace (ADR-012).

Canonical lifecycle naming and mapping is ADR-002; this is a summary, not a redefinition.

## A.5 Degraded-mode philosophy

Degradation is a first-class product state, not an error path.

1. Detect the loss (control, observation, voice, realtime, or network).
2. Announce it in plain language on the surface where it matters.
3. Fall back one tier at a time, never silently.
4. Offer the user the one action that helps most (catch up, rejoin, retry voice).
5. Restore automatically and announce restoration.

Never present a degraded room as a healthy one.

## A.6 KPIs and SLOs

**Product KPIs**

| KPI | Definition |
|---|---|
| Invite conversion | Invite links opened that result in a room join |
| Time to together | Room create → all invited members present |
| Start success | Rooms reaching `active` with all members started |
| Voice attach rate | Active rooms with ≥2 connected voice participants |
| Rejoin survival | Disconnects followed by successful rejoin within grace |
| Repeat group rate | Groups with ≥3 sessions in 30 days |

**Service SLOs** — targets live in [C4 — Performance Budget](./C4-performance-budget.md) as Provisional Target / Measured Baseline / Certified Threshold. Nothing in this document is a production commitment until it has a Certified Threshold and a passing certification record.

## A.7 Launch Envelope

The Launch Envelope is the formal boundary of v2.0. Anything outside it requires a new numbered ADR **and** its own milestone.

### Audience
Private groups of 2–8 people watching remotely. Maximum room size is 8; minimum viable room is 2.

### Platforms
1. Web desktop — first.
2. Android — second.
3. iOS — only after Room and Voice certification pass on Android and web.
4. TV — deferred beyond v2.0.
5. Desktop app — deferred beyond v2.0.

### Content modes
- Tier A — controlled/authorized sources with a certification record.
- Tier B — observation/assisted where a real media session exists.
- Tier C — deep link + countdown + voice + coordinated manual playback.

### Exclusions
- No premium OTT playback automation.
- No screen-capture-based synchronization.
- No accessibility-service automation or overlay automation.
- No public event discovery in M1.
- No mandatory AI companion — Po is always optional.
- No large-room video conferencing.

### Success criteria
- Invitees land in the intended room, including across sign-in.
- Users understand the capability tier before they commit.
- Playback or coordinated start begins correctly for every participant.
- Voice connects when enabled, and fails visibly and recoverably when it cannot.
- Temporary disconnects do not destroy the room.
- Leave and rejoin preserves room context and position awareness.

### Envelope enforcement
Every milestone in [D](./D-milestone-roadmap.md) declares its position inside the envelope. The release gate in [K](./K-launch-certification.md) fails any milestone that ships behaviour outside it.
