/**
 * Speech-to-text adapter abstraction — Sprint 1.1 §4.
 *
 * Audio is transient. No adapter may persist audio, and no transcript is stored
 * by this layer (Storage Design §6, Foundation §10).
 */

export interface SttTranscript {
  readonly text: string;
  readonly languageCode: string;
  readonly confidence: number;
  readonly isFinal: boolean;
}

export interface SttRequest {
  /** Raw audio bytes. Never written to disk or object storage. */
  readonly audio: ArrayBuffer;
  readonly mimeType: string;
  /** BCP-47 hint; adapters may auto-detect when omitted. */
  readonly languageCode?: string;
  readonly signal?: AbortSignal;
}

export interface SttCapabilities {
  readonly supportsStreaming: boolean;
  readonly supportedLanguages: readonly string[];
  readonly maxAudioSeconds: number;
}

export interface SttAdapter {
  readonly providerId: string;
  readonly capabilities: SttCapabilities;
  isConfigured(): boolean;
  transcribe(request: SttRequest): Promise<SttTranscript>;
  /** Optional; only when `capabilities.supportsStreaming` is true. */
  transcribeStream?(
    chunks: AsyncIterable<ArrayBuffer>,
    options?: { languageCode?: string; signal?: AbortSignal },
  ): AsyncIterable<SttTranscript>;
}
