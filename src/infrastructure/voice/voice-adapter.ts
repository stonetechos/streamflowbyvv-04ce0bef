/**
 * Voice transport abstraction — Sprint 1.1 §5.
 *
 * Modeled on the capabilities StreamFlow needs (join, mute, roster, quality),
 * not on LiveKit's API, so the transport can be replaced without touching the
 * voice feature (Foundation §2, §8).
 *
 * Media never traverses StreamFlow servers; this layer only manages the
 * connection to the voice transport.
 */

export type VoiceConnectionState =
  "disconnected" | "connecting" | "connected" | "reconnecting" | "failed";

/** Mirrors the sync-quality bands so the UI uses one vocabulary. */
export type VoiceQuality = "excellent" | "good" | "poor" | "unknown";

export interface VoiceParticipant {
  /** Domain participant identity, not a transport-internal SID. */
  readonly identity: string;
  readonly displayName: string;
  readonly isSpeaking: boolean;
  readonly isMuted: boolean;
  readonly isLocal: boolean;
}

export interface VoiceRoomStats {
  readonly quality: VoiceQuality;
  readonly latencyMs: number | null;
  readonly packetLossPercent: number | null;
}

export interface VoiceConnectOptions {
  readonly serverUrl: string;
  readonly token: string;
  /** Join muted by default; the user opts in to being heard (MVP Spec §7). */
  readonly startMuted?: boolean;
  readonly deviceId?: string;
}

export interface VoiceAdapterEvents {
  onStateChange?(state: VoiceConnectionState): void;
  onParticipantsChange?(participants: readonly VoiceParticipant[]): void;
  onStatsChange?(stats: VoiceRoomStats): void;
  onError?(error: unknown): void;
}

export interface VoiceAdapter {
  readonly providerId: string;
  readonly state: VoiceConnectionState;
  connect(options: VoiceConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
  setMuted(muted: boolean): Promise<void>;
  setInputDevice(deviceId: string): Promise<void>;
  listParticipants(): readonly VoiceParticipant[];
  getStats(): VoiceRoomStats;
  /** Returns an unsubscribe function. */
  subscribe(events: VoiceAdapterEvents): () => void;
}
