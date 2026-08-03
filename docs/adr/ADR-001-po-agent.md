# ADR-001 — Po: Intent-Driven AI Agent Architecture

**Status:** Proposed · **Extends:** Foundation Specification v1.0 (frozen, unmodified) · **Supersedes:** nothing · **Owner:** Principal AI Systems Architect

Documentation only. No code, SQL, migrations, UI, or scaffolding. This ADR occupies the AI module boundary reserved in Foundation §16 and consumes the layers defined there without altering them.

## 1. Context

The Foundation reserved an AI module but deliberately left it unspecified. StreamFlow now needs an intelligent companion layer that lets users express goals in natural language — spoken or typed, grammatically imperfect, incomplete — and have those goals become safe, correct actions inside StreamFlow. A keyword command bar cannot satisfy requests like "watch the number one Netflix India series with Saurabh and Shruti in five minutes", which requires content lookup, room creation, invitations, scheduling and a countdown as one coherent plan.

## 2. Decision

Adopt **Po**, an intent-driven agent that sits in the Feature layer of the Foundation architecture. Po interprets and plans; it never touches Supabase, LiveKit, provider plugins, or the database directly. Every effect Po produces happens by calling a registered tool that wraps a Foundation domain service. Voice and text are two adapters into one intelligence — there is no separate voice pipeline and no separate text pipeline.

## 3. Layer placement (Foundation-compliant)

```text
Presentation      Po surface: mic button, transcript, clarification prompts, plan preview
   ↓
Feature           PO CORE — intent, planning, conversation, memory, tool execution
   ↓
Domain            RoomService, PlaybackService, InvitationService, ComplianceService, ...
   ↓
Repository        unchanged interfaces
   ↓
Infrastructure    LLM adapter, STT/TTS adapters, memory store adapter
```

Po Core imports domain service and tool-contract types only. It has zero knowledge of any AI vendor, transport, or storage engine. Removing Po must leave StreamFlow fully functional.

## 4. Pipeline modules and responsibilities

**Speech Adapter** — captures microphone audio, handles wake/press-to-talk, endpointing, barge-in, and audio device state. Replaceable; emits audio frames only.

**Speech-to-Text Adapter** — converts audio to a transcript with confidence and language hints. Replaceable (cloud or on-device). Its only output contract is text plus metadata, so a text input bypasses it entirely.

**Text Normalization** — deterministic, non-AI pre-processing: whitespace and punctuation cleanup, filler removal, number/duration/time-expression normalization ("in five minutes", "ten past nine"), name candidate detection, locale tagging. Keeps prompts smaller and makes low-confidence transcripts recoverable.

**Intent Engine** — resolves the utterance into a structured intent: intent type, extracted entities (people, content, provider, language, time, room), confidence, and a list of missing-required slots. Enriched with conversation context and consented memory. It classifies and extracts; it never decides how to act.

**Planning Engine** — turns an intent into an ordered, dependency-aware plan of tool calls with a declared expected outcome. It marks steps as reversible or irreversible, may branch on runtime results, and defers to the Conversation Manager whenever a required slot is unresolved. It never fabricates missing values.

**Tool Registry** — the sole catalogue of what Po can do. Each entry declares name, description, input contract, output contract, side-effect class (read / reversible write / irreversible write), required permissions, compliance sensitivity, and confirmation policy. The registry is what the LLM adapter is told about; nothing outside it is invocable.

**Tool Executor** — validates arguments against the contract, checks authorization and rate limits, consults ComplianceService for provider-sensitive tools, requests user confirmation where policy requires, executes via the domain service, records the result, emits domain events, and reports failures back to the plan for repair rather than silent abandonment.

**Memory Engine** — explicit, opt-in preference storage (§9).

**Prompt Library** — versioned prompt assets (§8).

**LLM Adapter** — provider abstraction (§6).

**ComplianceService** — existing Foundation authority, consulted, never re-implemented (§11).

**Conversation Manager** — owns the session: turn history, pending clarifications, unresolved slots, active plan, interruption and cancellation ("stop", "no, not that one"), and multi-turn continuity. It is the state machine everything else reads from.

## 5. Execution flow

```text
input (voice|text)
  → normalize
  → intent
  → memory + conversation context merge
  → plan
  → missing slots? → clarify → back to intent with new slot filled
  → compliance gate per provider-sensitive step
  → confirmation gate per irreversible step
  → execute step-by-step
  → observe result → repair or continue
  → summarize outcome to user
```

Every stage is observable: each turn carries a correlation id so a single utterance can be traced through intent, plan, tool calls, and emitted domain events, per Foundation §6.

## 6. AI provider independence

Po Core depends on a narrow **model capability interface**, not a vendor. The interface exposes only: text generation, structured/schema-constrained generation, tool-choice generation, streaming, and optional embeddings — expressed in Po's own vocabulary.

- Adapters exist for OpenAI, Anthropic, Google Gemini, Mistral, Groq, DeepSeek, Ollama, LM Studio, and any future local or self-hosted runtime. This ADR recommends none; selection is configuration.
- Adapters normalize provider differences: message shape, tool/function-call syntax, structured-output enforcement, token limits, refusals, and error taxonomies (rate limit, quota, validation, transport) into Po-level error types.
- Capability negotiation: an adapter declares what it supports (native tool calling, JSON schema enforcement, streaming, context size). Po degrades gracefully — for example, falling back to constrained text parsing where native tool calling is absent — without Po Core changing.
- Routing is policy-driven: different stages (intent, planning, conversation, summarization) may bind to different models, and a fallback chain handles provider outage. Model selection lives in configuration and prompt metadata, never in feature code.
- Keys and model calls remain server-side per Foundation §18. No provider SDK is imported by Po Core or by any presentation component.

## 7. Tool Registry and extensibility

Initial tool set: SearchContent, SearchTrendingContent, CreateRoom, InviteUsers, ScheduleWatchParty, StartCountdown, JoinVoice, LeaveVoice, OpenProvider, PausePlayback, ResumePlayback, SeekPlayback, EnableSubtitles, DisableSubtitles, ChangeAudioLanguage, RecommendContent, CancelWatchParty, ShareInvite, UpdateRoomSettings, OpenUserPreferences.

Adding a tool requires: (1) a domain service capable of the action, (2) a registry declaration with contracts and policy metadata, (3) optional prompt examples, (4) a provider-matrix/compliance note if provider-sensitive. **Po Core is not touched.** Po Core contains no tool-specific branching, no tool name literals, and no per-tool prompt text — the registry is discovered at runtime and rendered into the planning context.

Tools are grouped into namespaces (content, room, playback, social, voice, settings) so registry growth stays legible, and each tool is gated by a Foundation feature flag so capabilities can be rolled out or disabled remotely (Foundation §10).

Future capabilities — smart recommendations, shared playlists, calendar integration, reminders, AI summaries, multi-language conversation, accessibility actions, smart-TV control, home automation, third-party plugins — all arrive as new tools and adapters, never as changes to intent, planning, or execution internals.

## 8. Prompt Library

Version-controlled plain-text/markdown assets with metadata (id, version, locale, target stage, model-capability requirements, changelog). No prompt is embedded in component or service code.

- **System Prompt** — Po's identity, boundaries, compliance posture, tone, refusal style.
- **Intent Prompt** — utterance → structured intent and slot extraction.
- **Planning Prompt** — intent + tool registry → ordered plan.
- **Clarification Prompt** — missing slots → one concise, answerable question.
- **Conversation Prompt** — natural replies, acknowledgements, error explanations.
- **Summarization Prompt** — session/plan/outcome condensation.

Prompts are portable: readable and reusable in any environment with no Lovable-specific syntax. Prompt changes are reviewed like code, and every prompt version is recorded on the turns that used it so behaviour changes are attributable.

## 9. Memory (privacy-first)

Po remembers **only** what the user explicitly saves. Nothing is inferred into long-term memory, and no conversation is retained beyond the session unless the user asks.

Two tiers:

- **Session memory** — ephemeral turn context, discarded when the session ends.
- **Preference memory** — explicit, user-owned: favourite streaming services, preferred UI/audio/subtitle language, favourite watch partners, preferred countdown duration.

Guarantees: every stored item is viewable, editable, exportable, and deletable; saving is an explicit confirmed action; memory writes emit domain events; no credentials, tokens, payment data, or provider session material may ever enter memory; storage follows Foundation §17/§18 (RLS scoped to the owning user).

## 10. Clarification behaviour

Po never guesses a required slot. When a slot is missing or an entity resolves ambiguously (two friends named similarly, a title matching several works, an unspecified provider), the Conversation Manager suspends the plan and asks one short question offering concrete options — the canonical pattern being "choose from your preferred services, or specify Netflix, Prime Video, YouTube, another provider?".

Rules: one question per turn; options grounded in real, available data; confirm before irreversible or public actions (cancelling a party, inviting a group, notifying others); interpret low STT confidence as ambiguity, not as a wrong answer; always leave a plain "cancel" path.

## 11. Compliance integration

ComplianceService is consulted before any provider-sensitive tool executes; Po holds no compliance rules of its own and cannot override a verdict. Po inherits every Foundation prohibition: no DRM circumvention, no subscription or regional bypass, no media proxying, no scraping, no credential or token sharing. Where a provider is Manual Sync, Experimental, or Unverified, Po must say so plainly and offer the lawful alternative (for example, a synchronized countdown instead of remote playback control). Refusals are explained in human terms — what cannot be done and why — never as an opaque error. Compliance denials are logged with the originating utterance's correlation id.

## 12. Failure and safety model

- **STT failure / low confidence** → ask for repetition or offer text entry; never act on a guess.
- **Intent below confidence threshold** → clarify rather than plan.
- **LLM unavailable or invalid output** → fall back through the model chain; if still failing, tell the user Po is unavailable and leave the app fully usable manually.
- **Tool failure** → report to the plan; retry only idempotent reads; never silently retry writes.
- **Partial plan failure** → state exactly what succeeded and what did not; offer to undo reversible steps.
- **Non-negotiable:** Po may not invent content, people, rooms, or provider capabilities; unverifiable results are surfaced as unknown.

## 13. Consequences

_Positive:_ natural-language control of the whole product; capability growth is additive; provider lock-in avoided; compliance enforced at the single existing authority; Po is removable without breaking StreamFlow.

_Negative / accepted:_ an extra abstraction layer over model calls; prompt and registry assets must be maintained and reviewed; latency budgets and model cost need monitoring; clarification-first behaviour trades some speed for correctness — an accepted trade.

## 14. Alternatives rejected

- **Keyword/command grammar** — cannot handle imperfect natural speech or multi-step goals.
- **Direct SDK use in components** — violates Foundation layering and creates vendor lock-in.
- **Single-provider agent framework** — contradicts the portability doctrine (Foundation §2).
- **Po writing to repositories directly** — bypasses domain services and compliance; rejected outright.
- **Implicit memory learning** — conflicts with the privacy-first stance.

## 15. Open questions requiring validation

Latency targets for voice → action; whether on-device STT is required for acceptable responsiveness; per-turn cost ceiling and rate limits; how entity resolution handles duplicate friend names at scale; whether plan previews should be shown before every multi-step execution or only irreversible ones; wake-word support and its privacy implications; behaviour of the microphone pipeline inside Capacitor webviews; how multilingual conversation interacts with Foundation §14 localization.

## 16. Documentation impact

New entries under the Foundation §20 structure: `adr/ADR-001-po-agent.md` (this record), `architecture/po/` (module map, pipeline, state machine), `api/po-tool-registry.md`, `api/po-prompt-library.md`, `security.md` and `compliance.md` addenda for Po-specific memory and provider-action rules. The Foundation Specification itself remains untouched.
