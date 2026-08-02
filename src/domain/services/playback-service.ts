/**
 * PlaybackService — Foundation §3, Sprint 1.6.
 *
 * Owns playback-session and countdown semantics in Domain terms. Countdown
 * bounds come from Foundation §14.1 via the shared constants module; nothing
 * here re-declares a number (Build Rules §10).
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { CatalogEvent } from "@/domain/events/event-bus";
import type { PlaybackStatus, SessionEndReason, SyncMode } from "@/domain/shared/domain-enums";
import { COUNTDOWN, TIME } from "@/shared/constants/system-constants";

import type { DomainServiceContext, Intent } from "./service-context";

export interface PlaybackService {
  startSession(
    input: {
      playbackSessionId: string;
      code: string;
      roomId: string;
      providerId: string;
      syncMode: SyncMode;
    },
    intent: Intent,
  ): Promise<CatalogEvent<"PlaybackSessionStarted">>;
  scheduleCountdown(
    input: { roomId: string; durationSeconds?: number; scheduledByProfileId: string },
    intent: Intent,
  ): Promise<CatalogEvent<"CountdownScheduled">>;
  fireCountdown(roomId: string, intent: Intent): Promise<CatalogEvent<"CountdownFired">>;
  cancelCountdown(
    input: { roomId: string; cancelledByProfileId: string; reason: string },
    intent: Intent,
  ): Promise<CatalogEvent<"CountdownCancelled">>;
  start(
    input: { roomId: string; positionMs: number },
    intent: Intent,
  ): Promise<CatalogEvent<"PlaybackStarted">>;
  pause(
    input: { roomId: string; positionMs: number; pausedByProfileId: string },
    intent: Intent,
  ): Promise<CatalogEvent<"PlaybackPaused">>;
  resume(
    input: { roomId: string; positionMs: number },
    intent: Intent,
  ): Promise<CatalogEvent<"PlaybackResumed">>;
  seek(
    input: {
      roomId: string;
      fromPositionMs: number;
      toPositionMs: number;
      actorProfileId: string;
      syncMode: SyncMode;
    },
    intent: Intent,
  ): Promise<CatalogEvent<"PlaybackSeeked">>;
  end(
    input: { playbackSessionId: string; roomId: string; endReason: SessionEndReason },
    intent: Intent,
  ): Promise<CatalogEvent<"PlaybackEnded">>;
  isCountdownDurationValid(durationSeconds: number): boolean;
  /** ADR-004: the watching screen reads `playback_status`, never a derived flag. */
  isTerminal(status: PlaybackStatus): boolean;
}

export function createPlaybackService(context: DomainServiceContext): PlaybackService {
  const { events, clock } = context;

  const isCountdownDurationValid = (seconds: number): boolean =>
    Number.isInteger(seconds) &&
    seconds >= COUNTDOWN.MIN_SECONDS &&
    seconds <= COUNTDOWN.MAX_SECONDS;

  return {
    isCountdownDurationValid,
    isTerminal: (status) => status === "ended",

    startSession: (input, intent) =>
      events.publish("PlaybackSessionStarted", input.roomId, { ...input }, intent),

    scheduleCountdown(input, intent) {
      const durationSeconds = input.durationSeconds ?? COUNTDOWN.DEFAULT_SECONDS;
      if (!isCountdownDurationValid(durationSeconds)) {
        throw domainError("SYNC_COUNTDOWN_OUT_OF_RANGE", {
          operation: "PlaybackService.scheduleCountdown",
          aggregateId: input.roomId,
        });
      }
      const targetAt = new Date(clock.now().getTime() + durationSeconds * TIME.SECOND_MS);
      return events.publish(
        "CountdownScheduled",
        input.roomId,
        {
          roomId: input.roomId,
          countdownTargetAt: targetAt.toISOString(),
          durationSeconds,
          scheduledByProfileId: input.scheduledByProfileId,
        },
        intent,
      );
    },

    fireCountdown: (roomId, intent) =>
      events.publish(
        "CountdownFired",
        roomId,
        { roomId, firedAt: clock.now().toISOString() },
        intent,
      ),

    cancelCountdown: (input, intent) =>
      events.publish("CountdownCancelled", input.roomId, { ...input }, intent),

    start: (input, intent) =>
      events.publish(
        "PlaybackStarted",
        input.roomId,
        { ...input, anchorServerTime: clock.now().toISOString() },
        intent,
      ),

    pause: (input, intent) => events.publish("PlaybackPaused", input.roomId, { ...input }, intent),

    resume: (input, intent) =>
      events.publish(
        "PlaybackResumed",
        input.roomId,
        { ...input, anchorServerTime: clock.now().toISOString() },
        intent,
      ),

    seek({ syncMode, ...input }, intent) {
      // ADR-003: a manual-sync room has no remote control to seek with.
      if (syncMode === "manual") {
        throw domainError("PROVIDER_CAPABILITY_UNSUPPORTED", {
          operation: "PlaybackService.seek",
          aggregateId: input.roomId,
        });
      }
      return events.publish("PlaybackSeeked", input.roomId, { ...input }, intent);
    },

    end: (input, intent) => events.publish("PlaybackEnded", input.roomId, { ...input }, intent),
  };
}
