# H — Native and Multi-Platform Architecture

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

## H.1 Shape

```text
┌──────────────────────────────────────────────────────────┐
│ Platform Shells                                          │
│  Web (TanStack Start)  Android (Capacitor)  iOS  TV  Desktop │
├──────────────────────────────────────────────────────────┤
│ Platform Adapters — the only platform-aware code          │
│  deep-link · share intake · notifications · storage ·     │
│  media session · permissions · haptics · lifecycle        │
├──────────────────────────────────────────────────────────┤
│ Core Domain — the 13 engines, platform-agnostic           │
├──────────────────────────────────────────────────────────┤
│ Infrastructure — persistence, realtime, voice, AI         │
└──────────────────────────────────────────────────────────┘
```

The Core Domain never branches on platform. Platform difference is expressed as a **capability tuple** ([B](./B-capability-matrix.md)) resolved by the Provider Engine, not as conditional logic scattered through features.

## H.2 Adapter surface

Every platform must implement the same adapter contracts:

| Adapter | Responsibility | Web | Android | iOS |
|---|---|---|---|---|
| Deep link | Open a provider destination and report the outcome | URL navigation | Intent | Universal link / scheme |
| Share intake | Receive shared content into a room | Web Share Target | Share intent | Share extension |
| Notification | Deliver and badge | In-app + Web Push | System channel | APNs |
| Storage | Durable local state for offline intents | IndexedDB | Native store | Native store |
| Media session | Observe or control a media surface | Media element / embed | Native session | Native session |
| Permissions | Microphone, notification | Browser prompt | Runtime permission | System prompt |
| Haptics | Delight cues | Vibration API where available | Native | Native |
| App lifecycle | Background/foreground transitions | Page visibility | Activity lifecycle | Scene lifecycle |

An adapter that cannot implement a contract reports `unsupported`. The Provider and Sync Engines then resolve a lower tier. They never guess.

## H.3 Tier consequences of platform

Because tier is a property of `source · adapter · platform · version`, the same source legitimately holds different tiers per platform. This is expected, documented per row, and disclosed to the user. It is never smoothed over.

## H.4 Platform sequencing

1. **Web desktop** — reference implementation; all adapters implemented first.
2. **Android (Capacitor)** — second; deep link, share intake, notifications, permissions prioritised.
3. **iOS** — only after Room and Voice certification pass on web and Android.
4. **TV / Desktop** — deferred beyond v2.0 by ADR.

## H.5 Certification consequence

Platform is a mandatory column in every certification row ([K.4](./K-launch-certification.md#k4-the-launch-certification-matrix)). A capability certified on web desktop is **not** certified on Android. Cross-platform claims require per-platform rows.

## H.6 Prohibited native mechanisms

Regardless of technical availability on a platform: no accessibility-service automation, no overlay injection, no screen capture for synchronization, no automated interaction with a third-party app's UI. ADR-014 and P8 apply identically on native.
