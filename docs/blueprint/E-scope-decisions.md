# E — Scope Decisions

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

## E.1 Removed from v2.0 — permanently excluded

| Decision | Reason |
|---|---|
| Screen-capture-based synchronization | ADR-014, P8. Prohibited mechanism. |
| Accessibility-service or overlay automation | ADR-014, P8. Prohibited mechanism. |
| Storing provider credentials or session tokens | P8. Never acceptable. |
| Proxying, scraping, or re-hosting media | P8. Never acceptable. |
| Region or subscription evasion | P8. Never acceptable. |
| Any UI implying control over a Tier B/C source | P1. |

These are recorded as `excluded` rows in [B](./B-capability-matrix.md) so future proposals are answered by the document.

## E.2 Deferred beyond v2.0

| Item | Deferred to | Reason |
|---|---|---|
| TV platforms | Post-v2.0 ADR | Input model and capability tiers unvalidated |
| Desktop app | Post-v2.0 ADR | No capability advantage proven yet |
| Public event discovery | M6+ | Outside the Launch Envelope for M1 |
| Rooms above 8 participants | Post-v2.0 ADR | Voice and presence cost curves unmeasured |
| Video conferencing | Not planned | Violates P3 trade-off and the envelope |
| Watch history and recommendations | M5+ | Retention scope, not launch scope |

## E.3 Accepted risks

| Risk | Why accepted | Mitigation |
|---|---|---|
| Tier C is the default for premium OTT | Legally and technically unavoidable | Honest disclosure, excellent countdown and voice, catch-up guidance |
| Countdown spread on poor networks | Physics of the network | Certified threshold under High Latency and Packet Loss profiles |
| iOS capability parity is unknown | Platform constraints | iOS rows stay `investigating` until certified |
| Chat and Moderation are contract-only | Not launch-critical | Contracts exist so activation is additive, not structural |
| Baselines are unmeasured at freeze time | Measurement is M0's job | No Certified Threshold may be set without a baseline |

## E.4 Non-negotiable for launch

1. Invite links land the user in the intended room, including across sign-in.
2. Capability tier is disclosed before commitment.
3. No fabricated synchronization state, anywhere.
4. Voice fails visibly and recoverably, never silently.
5. Temporary disconnects never destroy a room.
6. WCAG 2.1 AA on every launch surface.
7. Every Tier A claim has a passing certification record.
