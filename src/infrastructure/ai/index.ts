export {
  isAiCapabilityAvailable,
  llmRegistry,
  sttRegistry,
  ttsRegistry,
  type AiCapability,
} from "./provider-registry";
export type {
  LlmAdapter,
  LlmCapabilities,
  LlmCompletion,
  LlmCompletionRequest,
  LlmMessage,
  LlmRole,
  LlmToolCall,
  LlmToolSchema,
  LlmUsage,
} from "./llm-adapter";
export type {
  SttAdapter,
  SttCapabilities,
  SttRequest,
  SttTranscript,
} from "./stt-adapter";
export type { TtsAdapter, TtsAudio, TtsCapabilities, TtsRequest, TtsVoice } from "./tts-adapter";
