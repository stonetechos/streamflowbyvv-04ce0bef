/**
 * Typed domain event catalog — Sprint 1.6 §4.
 *
 * Traceability: `docs/api/domain-event-catalog-v1.0.md` v1.0, §2–§9. This file
 * is a transcription, not a design: no event, version, or payload field exists
 * here that is not published in the catalog. New events require a numbered ADR
 * (Build Rules §7, §13).
 */
import type { SyncQualityBand } from "@/shared/constants/system-constants";

import type { AggregateType } from "./event.types";

/* ---------------------------------------------------------------- payloads */

/** §2 — Identity events, aggregate `profile`. */
export interface IdentityEventPayloads {
  SignedUp: { profileId: string; code: string; locale: string; signupMethod: string };
  ProfileUpdated: { profileId: string; changedFields: readonly string[] };
  PreferencesUpdated: {
    profileId: string;
    preferenceTable: string;
    changedFields: readonly string[];
  };
  UserBlocked: { blockerProfileId: string; blockedProfileId: string; reason: string };
  UserUnblocked: { blockerProfileId: string; blockedProfileId: string };
  AccountDeletionRequested: { profileId: string; requestedAt: string };
}

/** §3 — Room events, aggregate `room`. */
export interface RoomEventPayloads {
  RoomCreated: {
    roomId: string;
    code: string;
    hostProfileId: string;
    name: string;
    visibility: string;
    maxMembers: number;
  };
  RoomProviderSelected: {
    roomId: string;
    providerId: string;
    syncMode: string;
    complianceVerdict: string;
  };
  MemberJoined: { roomId: string; profileId: string; role: string };
  MemberLeft: { roomId: string; profileId: string; leftReason: string };
  MemberRemoved: { roomId: string; profileId: string; removedByProfileId: string };
  MemberReadyChanged: { roomId: string; profileId: string; isReady: boolean };
  RoomStatusChanged: { roomId: string; fromStatus: string; toStatus: string; reason: string };
  RoomEnded: {
    roomId: string;
    endReason: string;
    endedAt: string;
    participantProfileIds: readonly string[];
  };
}

/** §4 — Invitation events, aggregate `room`. */
export interface InvitationEventPayloads {
  InviteCreated: {
    inviteId: string;
    code: string;
    roomId: string;
    channel: string;
    expiresAt: string;
  };
  InviteDelivered: { inviteId: string; channel: string; deliveryStatus: string };
  InviteAccepted: { inviteId: string; roomId: string; profileId: string };
  InviteDeclined: { inviteId: string; roomId: string; profileId: string };
  InviteExpired: { inviteId: string; roomId: string };
  InviteRevoked: { inviteId: string; roomId: string; revokedByProfileId: string };
}

/** §5 — Playback and sync events, aggregate `room`. */
export interface PlaybackEventPayloads {
  PlaybackSessionStarted: {
    playbackSessionId: string;
    code: string;
    roomId: string;
    providerId: string;
    syncMode: string;
  };
  CountdownScheduled: {
    roomId: string;
    countdownTargetAt: string;
    durationSeconds: number;
    scheduledByProfileId: string;
  };
  CountdownFired: { roomId: string; firedAt: string };
  CountdownCancelled: { roomId: string; cancelledByProfileId: string; reason: string };
  PlaybackStarted: { roomId: string; positionMs: number; anchorServerTime: string };
  PlaybackPaused: { roomId: string; positionMs: number; pausedByProfileId: string };
  PlaybackResumed: { roomId: string; positionMs: number; anchorServerTime: string };
  PlaybackSeeked: {
    roomId: string;
    fromPositionMs: number;
    toPositionMs: number;
    actorProfileId: string;
  };
  PlaybackEnded: { playbackSessionId: string; roomId: string; endReason: string };
  ClockOffsetUpdated: {
    roomId: string;
    profileId: string;
    clockOffsetMs: number;
    sampleCount: number;
    qualityBand: SyncQualityBand;
  };
  DriftMeasured: {
    roomId: string;
    profileId: string;
    driftMs: number;
    qualityBand: SyncQualityBand;
  };
  ResyncRequested: { roomId: string; requestedByProfileId: string; driftMs: number };
  ResyncApplied: { roomId: string; positionMs: number; anchorServerTime: string };
}

/** §6 — Voice events, aggregate `room`. Never carries a token or audio data. */
export interface VoiceEventPayloads {
  VoiceSessionStarted: { voiceSessionId: string; code: string; roomId: string };
  VoiceParticipantJoined: { voiceSessionId: string; profileId: string };
  VoiceParticipantLeft: { voiceSessionId: string; profileId: string; reason: string };
  VoiceParticipantMuteChanged: {
    voiceSessionId: string;
    profileId: string;
    isMuted: boolean;
    isDeafened: boolean;
  };
  VoiceQualityChanged: { voiceSessionId: string; profileId: string; connectionQuality: string };
  VoiceSessionEnded: { voiceSessionId: string; endReason: string };
}

/** §7 — Provider and compliance events, aggregate `provider`. */
export interface ProviderEventPayloads {
  ProviderStatusChanged: {
    providerId: string;
    fromStatus: string;
    toStatus: string;
    effectiveFrom: string;
  };
  ProviderCapabilityChanged: { providerId: string; capability: string; supportLevel: string };
  ComplianceVerdictIssued: {
    providerId: string;
    regionCode: string;
    action: string;
    ruleId: string;
    correlationId: string;
  };
  ComplianceActionBlocked: {
    providerId: string;
    regionCode: string;
    attemptedAction: string;
    ruleId: string;
    origin: string;
  };
}

/** §8 — Po events, aggregate `po_session`. Never carries raw utterance text. */
export interface PoEventPayloads {
  PoSessionStarted: { poSessionId: string; code: string; profileId: string; entrySurface: string };
  PoIntentRecognized: { poSessionId: string; intentKey: string; confidence: number };
  PoPlanProposed: {
    poSessionId: string;
    planId: string;
    stepCount: number;
    requiresConfirmation: boolean;
  };
  PoClarificationRequested: { poSessionId: string; clarificationId: string; slotKey: string };
  PoClarificationAnswered: { poSessionId: string; clarificationId: string; slotKey: string };
  PoPlanApproved: { poSessionId: string; planId: string };
  PoToolExecuted: { poSessionId: string; planId: string; toolKey: string; status: string };
  PoPlanCompleted: { poSessionId: string; planId: string; outcome: string };
  PoPlanFailed: { poSessionId: string; planId: string; errorCode: string };
  PoMemoryStored: { poSessionId: string; memoryId: string; memorySource: string };
  PoMemoryDeleted: { profileId: string; memoryId: string };
}

/** §9 — Feature flag events, aggregate `feature_flag`. */
export interface FeatureFlagEventPayloads {
  FeatureFlagChanged: { flagId: string; key: string; fromState: string; toState: string };
  FeatureFlagAssigned: { flagId: string; profileId: string; assignmentSource: string };
}

/** The complete v1.0 event surface. */
export interface DomainEventPayloads
  extends
    IdentityEventPayloads,
    RoomEventPayloads,
    InvitationEventPayloads,
    PlaybackEventPayloads,
    VoiceEventPayloads,
    ProviderEventPayloads,
    PoEventPayloads,
    FeatureFlagEventPayloads {}

export type DomainEventName = keyof DomainEventPayloads;

/* ---------------------------------------------------------------- registry */

export interface EventDescriptor {
  readonly name: DomainEventName;
  readonly version: number;
  readonly aggregateType: AggregateType;
}

function descriptors(
  aggregateType: AggregateType,
  names: readonly DomainEventName[],
): Record<string, EventDescriptor> {
  return Object.fromEntries(
    names.map((name) => [name, { name, version: 1, aggregateType } as EventDescriptor]),
  );
}

/**
 * Every catalog event is version 1 at v1.0. A payload change ships as a new
 * version entry, never as a mutation of this one (catalog §1).
 */
export const EVENT_CATALOG: Readonly<Record<DomainEventName, EventDescriptor>> = Object.freeze({
  ...descriptors("profile", [
    "SignedUp",
    "ProfileUpdated",
    "PreferencesUpdated",
    "UserBlocked",
    "UserUnblocked",
    "AccountDeletionRequested",
  ]),
  ...descriptors("room", [
    "RoomCreated",
    "RoomProviderSelected",
    "MemberJoined",
    "MemberLeft",
    "MemberRemoved",
    "MemberReadyChanged",
    "RoomStatusChanged",
    "RoomEnded",
    "InviteCreated",
    "InviteDelivered",
    "InviteAccepted",
    "InviteDeclined",
    "InviteExpired",
    "InviteRevoked",
    "PlaybackSessionStarted",
    "CountdownScheduled",
    "CountdownFired",
    "CountdownCancelled",
    "PlaybackStarted",
    "PlaybackPaused",
    "PlaybackResumed",
    "PlaybackSeeked",
    "PlaybackEnded",
    "ClockOffsetUpdated",
    "DriftMeasured",
    "ResyncRequested",
    "ResyncApplied",
    "VoiceSessionStarted",
    "VoiceParticipantJoined",
    "VoiceParticipantLeft",
    "VoiceParticipantMuteChanged",
    "VoiceQualityChanged",
    "VoiceSessionEnded",
  ]),
  ...descriptors("provider", [
    "ProviderStatusChanged",
    "ProviderCapabilityChanged",
    "ComplianceVerdictIssued",
    "ComplianceActionBlocked",
  ]),
  ...descriptors("po_session", [
    "PoSessionStarted",
    "PoIntentRecognized",
    "PoPlanProposed",
    "PoClarificationRequested",
    "PoClarificationAnswered",
    "PoPlanApproved",
    "PoToolExecuted",
    "PoPlanCompleted",
    "PoPlanFailed",
    "PoMemoryStored",
    "PoMemoryDeleted",
  ]),
  ...descriptors("feature_flag", ["FeatureFlagChanged", "FeatureFlagAssigned"]),
} as Record<DomainEventName, EventDescriptor>);

export function isKnownEvent(name: string): name is DomainEventName {
  return Object.hasOwn(EVENT_CATALOG, name);
}

export function describeEvent(name: DomainEventName): EventDescriptor {
  return EVENT_CATALOG[name];
}
