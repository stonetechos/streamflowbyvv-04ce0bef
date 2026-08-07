/**
 * Post-session summary — Sprint H8.
 *
 * What the participant sees once the room is over. It answers, in their words:
 * how long were we together, who was there, what were we using, did we
 * actually get to watching, could we talk, did the connection wobble.
 *
 * No telemetry vocabulary reaches this surface: no "activation", no "funnel",
 * no "cohort", no "event", no "snapshot", no "revision". Those words belong to
 * the admin dashboard.
 */
import type { RoomTimeline } from "./beta-activation";
import { sessionDuration } from "./beta-activation";

export interface SessionSummary {
  readonly durationMs: number | null;
  readonly participantCount: number;
  readonly providerId: string | null;
  readonly reachedWatching: boolean;
  readonly chatAvailable: boolean;
  readonly voiceAvailable: boolean;
  /** Only surfaced when it actually happened; zero stays hidden. */
  readonly reconnects: number;
}

export function buildSessionSummary(input: {
  readonly timeline: RoomTimeline;
  readonly participantCount: number;
  readonly providerId: string | null;
  readonly reachedWatching: boolean;
  readonly chatAvailable: boolean;
  readonly voiceAvailable: boolean;
  readonly reconnects: number;
}): SessionSummary {
  return {
    durationMs: sessionDuration(input.timeline),
    participantCount: Math.max(0, Math.trunc(input.participantCount)),
    providerId: input.providerId,
    reachedWatching: input.reachedWatching,
    chatAvailable: input.chatAvailable,
    voiceAvailable: input.voiceAvailable,
    reconnects: Math.max(0, Math.trunc(input.reconnects)),
  };
}

/** Whole minutes, rounded up, so a 40-second party is not reported as zero. */
export function summaryMinutes(summary: SessionSummary): number | null {
  if (summary.durationMs === null) return null;
  return Math.max(1, Math.ceil(summary.durationMs / 60_000));
}

export function shouldShowReconnects(summary: SessionSummary): boolean {
  return summary.reconnects > 0;
}
