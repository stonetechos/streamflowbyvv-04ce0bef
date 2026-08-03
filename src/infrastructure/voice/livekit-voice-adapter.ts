/**
 * LiveKit voice adapter — Milestone G.
 *
 * The ONLY module in StreamFlow that knows LiveKit exists. It implements the
 * vendor-neutral `VoiceAdapter` contract (Sprint 1.1 §5) and translates the
 * SDK's vocabulary into ours: connection state, participants, mute, and a
 * quality band that matches the sync bands the rest of the app already uses.
 *
 * The SDK is imported dynamically so it never enters the SSR graph and never
 * costs anything on a device that does not join voice (Foundation §8).
 *
 * Media never traverses StreamFlow servers: this layer manages a connection
 * to the SFU and nothing else. No audio is recorded, stored, or forwarded.
 */
import { logger } from "@/foundation/logging";

import type {
  VoiceAdapter,
  VoiceAdapterEvents,
  VoiceConnectOptions,
  VoiceConnectionState,
  VoiceParticipant,
  VoiceQuality,
  VoiceRoomStats,
} from "./voice-adapter";

const MODULE = "voice-livekit";

type LiveKitModule = typeof import("livekit-client");
type LiveKitRoom = InstanceType<LiveKitModule["Room"]>;

const QUALITY_BY_SDK: Readonly<Record<string, VoiceQuality>> = {
  excellent: "excellent",
  good: "good",
  poor: "poor",
  lost: "poor",
  unknown: "unknown",
};

const STATE_BY_SDK: Readonly<Record<string, VoiceConnectionState>> = {
  disconnected: "disconnected",
  connecting: "connecting",
  connected: "connected",
  reconnecting: "reconnecting",
  signalReconnecting: "reconnecting",
};

export function createLiveKitVoiceAdapter(): VoiceAdapter {
  let room: LiveKitRoom | null = null;
  let sdk: LiveKitModule | null = null;
  let state: VoiceConnectionState = "disconnected";
  let deafened = false;
  let stats: VoiceRoomStats = { quality: "unknown", latencyMs: null, packetLossPercent: null };
  const listeners = new Set<VoiceAdapterEvents>();

  const emitState = (next: VoiceConnectionState) => {
    if (state === next) return;
    state = next;
    for (const listener of listeners) listener.onStateChange?.(next);
  };

  const emitParticipants = () => {
    const participants = snapshotParticipants(room);
    for (const listener of listeners) listener.onParticipantsChange?.(participants);
  };

  const emitStats = (quality: VoiceQuality) => {
    stats = { ...stats, quality };
    for (const listener of listeners) listener.onStatsChange?.(stats);
  };

  const emitError = (error: unknown) => {
    logger.warn("Voice transport error", { module: MODULE, error });
    for (const listener of listeners) listener.onError?.(error);
  };

  const applyDeafen = () => {
    if (!room) return;
    for (const participant of room.remoteParticipants.values()) {
      try {
        participant.setVolume(deafened ? 0 : 1);
      } catch (error) {
        emitError(error);
      }
    }
  };

  return {
    providerId: "livekit",

    get state() {
      return state;
    },

    async connect(options: VoiceConnectOptions) {
      if (room) await this.disconnect();
      emitState("connecting");
      try {
        sdk = await import("livekit-client");
        const instance = new sdk.Room({
          adaptiveStream: false,
          dynacast: false,
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(options.deviceId ? { deviceId: options.deviceId } : {}),
          },
        });
        room = instance;

        instance
          .on(sdk.RoomEvent.ConnectionStateChanged, (next: string) => {
            emitState(STATE_BY_SDK[next] ?? "disconnected");
          })
          .on(sdk.RoomEvent.Disconnected, () => emitState("disconnected"))
          .on(sdk.RoomEvent.Reconnecting, () => emitState("reconnecting"))
          .on(sdk.RoomEvent.Reconnected, () => {
            emitState("connected");
            applyDeafen();
          })
          .on(sdk.RoomEvent.ParticipantConnected, () => {
            applyDeafen();
            emitParticipants();
          })
          .on(sdk.RoomEvent.ParticipantDisconnected, emitParticipants)
          .on(sdk.RoomEvent.ActiveSpeakersChanged, emitParticipants)
          .on(sdk.RoomEvent.TrackMuted, emitParticipants)
          .on(sdk.RoomEvent.TrackUnmuted, emitParticipants)
          .on(sdk.RoomEvent.LocalTrackPublished, emitParticipants)
          .on(sdk.RoomEvent.MediaDevicesError, emitError)
          .on(sdk.RoomEvent.ConnectionQualityChanged, (quality: string, participant?: unknown) => {
            const local = participant === instance.localParticipant;
            if (local || participant === undefined) emitStats(QUALITY_BY_SDK[quality] ?? "unknown");
          });

        await instance.connect(options.serverUrl, options.token);
        await instance.localParticipant.setMicrophoneEnabled(options.startMuted !== true);
        emitState("connected");
        emitParticipants();
        emitStats(QUALITY_BY_SDK[String(instance.localParticipant.connectionQuality)] ?? "unknown");
      } catch (error) {
        room = null;
        emitState("failed");
        emitError(error);
        throw error;
      }
    },

    async disconnect() {
      const instance = room;
      room = null;
      deafened = false;
      if (instance) {
        try {
          await instance.disconnect();
        } catch (error) {
          emitError(error);
        }
      }
      emitState("disconnected");
      emitParticipants();
    },

    async setMuted(muted: boolean) {
      if (!room) return;
      await room.localParticipant.setMicrophoneEnabled(!muted);
      emitParticipants();
    },

    async setDeafened(next: boolean) {
      deafened = next;
      applyDeafen();
    },

    async setInputDevice(deviceId: string) {
      if (!room) return;
      await room.switchActiveDevice("audioinput", deviceId);
    },

    async setOutputDevice(deviceId: string) {
      if (!room) return;
      await room.switchActiveDevice("audiooutput", deviceId);
    },

    listParticipants() {
      return snapshotParticipants(room);
    },

    getStats() {
      return stats;
    },

    subscribe(events: VoiceAdapterEvents) {
      listeners.add(events);
      return () => {
        listeners.delete(events);
      };
    },
  };
}

function snapshotParticipants(room: LiveKitRoom | null): readonly VoiceParticipant[] {
  if (!room) return [];
  const local = room.localParticipant;
  const rows: VoiceParticipant[] = [
    {
      identity: local.identity,
      displayName: local.name ?? local.identity,
      isSpeaking: local.isSpeaking,
      isMuted: !local.isMicrophoneEnabled,
      isLocal: true,
    },
  ];
  for (const participant of room.remoteParticipants.values()) {
    rows.push({
      identity: participant.identity,
      displayName: participant.name ?? participant.identity,
      isSpeaking: participant.isSpeaking,
      isMuted: !participant.isMicrophoneEnabled,
      isLocal: false,
    });
  }
  return Object.freeze(rows);
}
