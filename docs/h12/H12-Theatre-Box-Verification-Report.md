# H12 — Theatre Box Playback Verification Report

Status: PASS (with scoped exclusions)
Mode: Verification only — no player redesign, no architecture change.
Date: 2026-08-09
Build under test: local dev build of the shipped H12 implementation
Browser: Chromium 141.0.7390.37 (headless), viewport 1280x900

## 1. Method and honesty boundary

Verification was executed in a real browser against the shipped theatre-box
implementation (`use-direct-player.ts`, `use-picture-in-picture.ts`,
`theater-box.tsx`, `player-controls.tsx`) through a temporary harness route that
mounts the same `TheaterBox` component the room stage mounts, with a local
direct-media source.

What this proves: the theatre box, its control surface, its state machine, and
the single-media-element PiP model behave correctly in a real browser.

What this does NOT prove, and is explicitly excluded below: OTT provider
playback (Netflix, Prime Video, Disney+, etc.). Those remain launch-only by
ADR-014 and are not embeddable; nothing in this report claims otherwise.

Codec note: the sandbox Chromium build has no proprietary codecs, so a
WebM/VP9 source was used. This affects the source file only, not the player.

## 2. Results

| # | Behaviour | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Launch into in-app theatre box (no external redirect) | PASS | `01_launch.png`; video mounted inside `[data-sf-player-stage]` |
| 2 | Play / pause from in-box controls | PASS | paused true→false→true via `[data-sf-player-action='play']` |
| 3 | Seek (+10 / -10) | PASS | currentTime 0.00 → 10.00 |
| 4 | Scrubber drag | PASS | scrub to ~50% → currentTime 15.00 |
| 5 | Volume slider | PASS | volume set to 0.30, unmuted |
| 6 | Mute toggle | PASS | muted true → false |
| 7 | Playback speed | PASS | playbackRate 1.5 via speed select |
| 8 | Fullscreen enter/exit | PASS | fullscreenElement = theatre box, then null |
| 9 | Document PiP entry | PASS | `02..05` shots; PiP window open, video moved out of stage, custom controls portalled into PiP window, 2 stylesheets copied |
| 10 | Custom controls render + work inside PiP | PASS | `09_pip_window_0.png`; pause/play driven from PiP window changed video state |
| 11 | Single media element, no restart on move | PASS | t=11.98s before PiP, t=13.58s inside PiP — continuous, one `<video>` in the document at all times |
| 12 | PiP exit and stage restoration | PASS | back in stage slot, exactly 1 video, t=13.66s continuing from PiP position |
| 13 | Stage placeholder while PiP is active | PASS | `[data-sf-pip-placeholder]` shown with "back to the theatre" action |
| 14 | Buffering overlay under constrained network | PASS | `10_buffering.png`; overlay appeared on seek at 8 kB/s, 800 ms latency |
| 15 | Source error state + retry | PASS | `07_error.png`; broken source → error overlay + "Try again"; restored source → readyState 4, overlay cleared |
| 16 | Ended state + replay | PASS | `08_ended.png`; ended overlay + Restart → playing from 0.8s |
| 17 | Keyboard control (Space, M, ArrowDown) | PASS | space toggled pause, `m` muted, ArrowDown lowered volume by one step |
| 18 | Captions control | PARTIAL | control correctly hidden when the source carries 0 text tracks; not exercised against a captioned source |
| 19 | PiP unsupported fallback messaging | NOT EXERCISED | sandbox Chromium supports Document PiP, so neither the element-PiP fallback nor the disabled-state message could be triggered in this environment |
| 20 | OTT provider in-box playback | OUT OF SCOPE | launch-only by ADR-014; no embedded playback attempted or claimed |

Console during the full run: one 404, deliberately induced by the error-state
step. No uncaught exceptions, no React warnings.

## 3. Verified vs unverified — explicit separation

Verified in a real browser: items 1–17 above, for direct/embeddable media.

Unverified: captions with an actual track list (18); PiP fallback and
disabled-state messaging on browsers without Document PiP (19); Safari and
Firefox behaviour; touch-device gesture ergonomics.

Not applicable / never claimed: in-app playback of DRM OTT services (20).
Those surfaces remain launch-only with capability disclosure, unchanged.

## 4. Conclusion

The shipped theatre box is the canonical playback and control surface, uses one
stable media element that survives stage → PiP → stage without restarting, keeps
custom controls in Document PiP, and holds all loading, buffering, error, retry,
ended and replay states inline. No defects were found that require a change to
the player. Follow-ups are limited to the two unverified rows (captioned source,
non-Document-PiP browser matrix).
