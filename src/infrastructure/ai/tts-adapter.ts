/**
 * Text-to-speech adapter abstraction — Sprint 1.1 §4.
 *
 * Synthesized audio is played and discarded; it is never stored
 * (Storage Design §6).
 */

export interface TtsVoice {
  readonly id: string;
  readonly label: string;
  /** BCP-47 tag; must cover the launch locales to be selectable. */
  readonly languageCode: string;
}

export interface TtsRequest {
  readonly text: string;
  readonly voiceId: string;
  readonly languageCode: string;
  /** 0.5–2.0, where 1 is the voice's natural rate. */
  readonly speakingRate?: number;
  readonly signal?: AbortSignal;
}

export interface TtsAudio {
  readonly audio: ArrayBuffer;
  readonly mimeType: string;
  readonly durationMs?: number;
}

export interface TtsCapabilities {
  readonly supportsStreaming: boolean;
  readonly supportedLanguages: readonly string[];
  readonly maxCharacters: number;
}

export interface TtsAdapter {
  readonly providerId: string;
  readonly capabilities: TtsCapabilities;
  isConfigured(): boolean;
  listVoices(): Promise<readonly TtsVoice[]>;
  synthesize(request: TtsRequest): Promise<TtsAudio>;
}
