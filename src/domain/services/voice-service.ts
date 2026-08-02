/**
 * VoiceService — Foundation §3, Sprint 1.6.
 *
 * Voice session lifecycle in Domain terms. No SFU, no token, no transport:
 * the LiveKit adapter sits behind the Infrastructure boundary and subscribes
 * to these events later. Catalog §6: no voice event ever carries a token,
 * a room secret, or audio data.
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { CatalogEvent } from "@/domain/events/event-bus";
import type { ConnectionQuality, VoiceStatus } from "@/domain/shared/domain-enums";

import type { DomainServiceContext, Intent } from "./service-context";

export interface VoiceService {
  startSession(
    input: { voiceSessionId: string; code: string; roomId: string },
    intent: Intent,
  ): Promise<CatalogEvent<"VoiceSessionStarted">>;
  participantJoined(
    input: { roomId: string; voiceSessionId: string; profileId: string; status: VoiceStatus },
    intent: Intent,
  ): Promise<CatalogEvent<"VoiceParticipantJoined">>;
  participantLeft(
    input: { roomId: string; voiceSessionId: string; profileId: string; reason: string },
    intent: Intent,
  ): Promise<CatalogEvent<"VoiceParticipantLeft">>;
  muteChanged(
    input: {
      roomId: string;
      voiceSessionId: string;
      profileId: string;
      isMuted: boolean;
      isDeafened: boolean;
    },
    intent: Intent,
  ): Promise<CatalogEvent<"VoiceParticipantMuteChanged">>;
  qualityChanged(
    input: {
      roomId: string;
      voiceSessionId: string;
      profileId: string;
      connectionQuality: ConnectionQuality;
    },
    intent: Intent,
  ): Promise<CatalogEvent<"VoiceQualityChanged">>;
  endSession(
    input: { roomId: string; voiceSessionId: string; endReason: string },
    intent: Intent,
  ): Promise<CatalogEvent<"VoiceSessionEnded">>;
  isJoinable(status: VoiceStatus): boolean;
}

export function createVoiceService(context: DomainServiceContext): VoiceService {
  const { events } = context;

  const isJoinable = (status: VoiceStatus): boolean =>
    status === "active" || status === "degraded";

  return {
    isJoinable,

    startSession: (input, intent) =>
      events.publish("VoiceSessionStarted", input.roomId, { ...input }, intent),

    participantJoined({ roomId, status, ...input }, intent) {
      if (!isJoinable(status)) {
        throw domainError("VOICE_SESSION_NOT_ACTIVE", {
          operation: "VoiceService.participantJoined",
          aggregateId: roomId,
        });
      }
      return events.publish("VoiceParticipantJoined", roomId, { ...input }, intent);
    },

    participantLeft: ({ roomId, ...input }, intent) =>
      events.publish("VoiceParticipantLeft", roomId, { ...input }, intent),

    muteChanged: ({ roomId, ...input }, intent) =>
      events.publish("VoiceParticipantMuteChanged", roomId, { ...input }, intent),

    qualityChanged: ({ roomId, ...input }, intent) =>
      events.publish("VoiceQualityChanged", roomId, { ...input }, intent),

    endSession: ({ roomId, ...input }, intent) =>
      events.publish("VoiceSessionEnded", roomId, { ...input }, intent),
  };
}
