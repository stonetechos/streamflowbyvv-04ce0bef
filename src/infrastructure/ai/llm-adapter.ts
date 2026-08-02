/**
 * LLM adapter abstraction — Sprint 1.1 §4, per ADR-001 (provider independence).
 *
 * One interface, many vendors. Nothing above Infrastructure may name a model
 * family, an SDK, or a wire format. Sprint 1.1 ships the abstraction only: no
 * adapter is implemented and no call is ever executed.
 */

export type LlmRole = "system" | "user" | "assistant";

export interface LlmMessage {
  readonly role: LlmRole;
  readonly content: string;
}

/** Vendor-neutral description of a callable tool, resolved by Po's registry. */
export interface LlmToolSchema {
  readonly name: string;
  readonly description: string;
  /** JSON Schema object. The lowest common denominator across vendors. */
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface LlmToolCall {
  readonly id: string;
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface LlmCompletionRequest {
  readonly messages: readonly LlmMessage[];
  readonly tools?: readonly LlmToolSchema[];
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
  readonly signal?: AbortSignal;
}

export interface LlmUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface LlmCompletion {
  readonly text: string;
  readonly toolCalls: readonly LlmToolCall[];
  readonly finishReason: "stop" | "length" | "tool_call" | "filtered" | "error";
  readonly usage?: LlmUsage;
}

export interface LlmCapabilities {
  readonly supportsTools: boolean;
  readonly supportsStreaming: boolean;
  readonly maxContextTokens: number;
}

export interface LlmAdapter {
  /** Stable identifier, e.g. `openai`, `anthropic`, `gemini`, `local`. */
  readonly providerId: string;
  readonly capabilities: LlmCapabilities;
  /** Whether credentials/endpoint are present. Checked before any call. */
  isConfigured(): boolean;
  complete(request: LlmCompletionRequest): Promise<LlmCompletion>;
  /** Optional; only when `capabilities.supportsStreaming` is true. */
  stream?(request: LlmCompletionRequest): AsyncIterable<string>;
}
