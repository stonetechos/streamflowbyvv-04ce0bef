# H11 — Hearo-Style Watch-Party Launch Model

Status: **Implemented (P0)** · Sprint H11 · Supersedes the H10.1 flow shape, not its models.

This report states the corrected mental model, the exact flow, what detection is
and is not possible, the per-provider capability matrix, and the P0/P1/P2 plan.
Every claim is repository truth; nothing here promises automated OTT control,
which ADR-014 rules out permanently.

---

## 1. The corrected mental model

The product is no longer "configure a room, then paste a link, then watch". It is:

```text
Choose service/content  →  Start watch party  →  Session created silently
        →  Provider opens in the coordinated session
        →  Title detected where possible  →  Invite friends  →  Watch together
```

The theatre is the session. The room is not a settings screen that happens to
contain a video; it is the live surface people sit in while the provider plays
in their own tab.

## 2. Corrected end-to-end flow (as shipped)

| Step | Surface | Behaviour after H11 |
| --- | --- | --- |
| 1 | Home | "What shall we watch today?" plus the service shelf. One tap on a service is the whole start gesture. |
| 2 | Home → room | Room is created silently, named "Watch party on {service}", scoped to that service. No naming step, no configuration step. |
| 3 | Theatre mount | A scoped room writes its own selection automatically (`providerBrowseUrl`), so the stage arrives already on that service. No launcher grid is rendered. |
| 4 | Stage | Primary action is **Start watch party on {service}** — one strong button, not a link form. |
| 5 | Launch | Opening the service announces `provider-launched` on the coordination stream. Host stage → "Opened in your browser". Guest stage → "The host has opened it — open it here too". |
| 6 | Invite | `InvitePanel` sits directly under the stage, in the start-of-session work, not in the top-right utility strip. |
| 7 | Countdown | Unchanged: shared clock, everyone presses play together. |
| 8 | Exit | Session end and rejoin unchanged. |

### Removed or buried

- **Removed:** the generic 17-service launcher inside a scoped room.
- **Removed:** the mandatory URL step for browse-mode providers.
- **Buried:** the link field now lives behind a collapsed
  "Have a direct link? Add it (optional)" disclosure, and is only primary for
  providers whose `selectionMode` genuinely needs a link (direct files, paste-link).
- **Removed:** "continue watching" for lobbies nobody is in.

## 3. Corrected room-state model

`deriveStageView` (`src/features/theater/stage-view.ts`) is the single decision:

| State | Condition | What the room shows |
| --- | --- | --- |
| `preparing` | a selection is being written | skeleton + "Setting the stage…" — never a blank panel |
| `empty` | nothing chosen | host: "Choose what to watch"; guest: waiting line |
| `handoff` | chosen, not embeddable | title, honest capability line, **Start watch party** |
| `handoff` (self-launched) | this person opened it | "Reopen {provider}" + "Opened in your browser" |
| `handoff` (host-launched) | the host opened it, this person has not | "Join on {provider}" + host-launched status |
| `embedded` | direct file with embedded playback | real player |

A launch is now a **room fact**, derived from the coordination event stream and
matched to the host member — not a private boolean in one browser.

## 4. Corrected dormant / rejoin rules

`src/domain/rooms/room-activity.ts`:

- `closed` — `ended` or `abandoned`. Terminal.
- `live` — actively watching, paused, or more than one person present.
- `dormant` — solo and quiet: **5 minutes** with a selection, **2 minutes**
  without one.

Only `live` rooms may be offered as "continue watching". Dormant rooms drop off
Home entirely and remain reachable through history.

## 5. Detection strategy (honest)

| Signal | Availability | Used |
| --- | --- | --- |
| Share-target intake (`/share`) | Web share to StreamFlow carries a provider URL, often with a title id | Yes — best-quality detection today |
| URL parsing of a pasted/shared link | `titleSegments` per provider give the title id | Yes |
| Provider metadata fetch | Blocked by CORS and ToS on all premium OTT | No |
| Browser tab observation | Impossible from a web page | No |
| MediaSession / Accessibility / overlays | ADR-014: prohibited or unusable | No |

Conclusion: automatic title detection exists **only** where the title arrives in
a URL (share intake or a pasted link). Everything else remains host-declared.
The UI never claims otherwise.

## 6. Capability matrix (unchanged truth, restated)

| Class | Providers | Selection | Control | Stage |
| --- | --- | --- | --- | --- |
| Direct file | `direct` | direct link | automatic | embedded player |
| Premium OTT | Netflix, Prime Video, JioHotstar, Disney+, JioCinema, SonyLIV, Zee5, MX Player, discovery+, JioTV, Apple TV+, HBO Max, Hulu, Peacock, Paramount+, Crunchyroll | browse | launch-only | honest handoff |
| Removed | YouTube | — | — | never offered |

Zero Tier A, zero Tier B. All OTT rows remain Tier C, coordinated manual sync.

## 7. Plan

**P0 — done this sprint**

- Scoped rooms auto-select their service; no launcher grid.
- Stage leads with "Start watch party"; link field buried.
- Launch is shared state; guest stage is never blank after the host launches.
- Dormancy cut to 5 minutes (2 without a selection).
- "Netflix night" wording gone — rooms read "Watch party on Netflix".

**P1 — next**

- Share-target intake promoted to a first-class entry point on Home.
- Return-to-tab nudge: when focus comes back after a launch, offer readiness in
  one tap instead of a separate control.
- Per-title continuity: remember the last title per service for a room.

**P2 — later**

- Browser extension spike for genuine title/position observation (the only
  legal route to better detection on the web).
- Native Android share fidelity, per ADR-014's ceiling.

## 8. Verification

- `bun test tests/product/` — 163 pass, including
  `tests/product/h11-launch-model.test.ts` (9 assertions on dormancy, scope, and
  stage launch states).
- `tsgo --noEmit` — clean.

---

## 9. H11.1 addendum — limits on screen, guests, and regression coverage

**Capability limits are now in the UI, not only here.** `CapabilityNote`
(`src/features/theater/components/capability-note.tsx`) renders every claim
straight from the capability record: a compact "cannot control" line inside the
stage on all screen sizes, and a full can/cannot panel under the stage whenever
a selection exists. The previous `hidden sm:block` limitation list — invisible
on mobile — is gone.

**Guest clarity.** A guest whose host has launched sees a live badge
("Host is watching on {provider}"), the host-launched status line, and a
**Join on {provider}** action. The stage carries `data-sf-stage-host-launched`
for certification selectors.

**Regression coverage** — `tests/product/h11-1-regression.test.ts`, 15 tests:

| Failure class | Guarded by |
| --- | --- |
| Scoped-room leakage | every provider scopes to exactly one service; catalog aliases resolve; the room's selection beats a stale creation key; blocked services never resolve, in any case; unknown keys fall back to an open room rather than a wrong one |
| Stale rejoin state | 6-minute solo lobby is dormant and non-resumable; 3-minute empty lobby is dormant; occupied and active rooms stay live; ended/abandoned rooms are never resumable |
| Empty stage after launch | across host/guest × self-launched × host-launched, the stage is always `handoff` with a status and a launch action; guest reflects host launch; guest transitions to their own launched state; ended rooms stay honest; countdown reads identically for host and guest |

Suite: `bun test tests/product/` — **178 pass**. `tsgo --noEmit` clean.
