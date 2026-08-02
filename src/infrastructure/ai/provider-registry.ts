/**
 * AI provider registry — Sprint 1.1 §4.
 *
 * Registration mechanism only. All three registries ship EMPTY: with no adapter
 * registered, AI is structurally unable to execute, which is the correct state
 * before any provider is chosen (ADR-001: provider independence).
 */
import type { LlmAdapter } from "./llm-adapter";
import type { SttAdapter } from "./stt-adapter";
import type { TtsAdapter } from "./tts-adapter";

export type AiCapability = "llm" | "stt" | "tts";

interface Registry<T extends { providerId: string; isConfigured(): boolean }> {
  register(adapter: T): void;
  get(providerId: string): T | undefined;
  list(): readonly T[];
  /** First registered adapter that reports itself configured. */
  resolveDefault(): T | null;
  reset(): void;
}

function createRegistry<T extends { providerId: string; isConfigured(): boolean }>(
  capability: AiCapability,
): Registry<T> {
  const adapters = new Map<string, T>();
  return {
    register(adapter) {
      if (adapters.has(adapter.providerId)) {
        throw new Error(`${capability} adapter already registered: ${adapter.providerId}`);
      }
      adapters.set(adapter.providerId, adapter);
    },
    get: (providerId) => adapters.get(providerId),
    list: () => Array.from(adapters.values()),
    resolveDefault: () =>
      Array.from(adapters.values()).find((adapter) => adapter.isConfigured()) ?? null,
    reset: () => adapters.clear(),
  };
}

export const llmRegistry = createRegistry<LlmAdapter>("llm");
export const sttRegistry = createRegistry<SttAdapter>("stt");
export const ttsRegistry = createRegistry<TtsAdapter>("tts");

/** True when at least one configured adapter exists for the capability. */
export function isAiCapabilityAvailable(capability: AiCapability): boolean {
  switch (capability) {
    case "llm":
      return llmRegistry.resolveDefault() !== null;
    case "stt":
      return sttRegistry.resolveDefault() !== null;
    case "tts":
      return ttsRegistry.resolveDefault() !== null;
    default:
      return false;
  }
}
