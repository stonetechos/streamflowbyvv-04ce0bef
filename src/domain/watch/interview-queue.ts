/**
 * Beta interview queue — Sprint H8.
 *
 * Turns product signals into a prioritized list of conversations worth having.
 * A candidate is a cohort, not a person: the queue carries an anonymous cohort
 * id and the signals that make the conversation interesting. Reaching the
 * person is done out of band by the team, not by this product.
 *
 * The questions never appear in a room. This is an admin surface.
 */

export const INTERVIEW_SIGNALS = [
  "invited_but_never_watched",
  "repeated_reconnect_failure",
  "watched_but_never_returned",
  "used_manual_sync",
  "used_voice",
  "activated",
] as const;
export type InterviewSignal = (typeof INTERVIEW_SIGNALS)[number];

/**
 * Higher wins. The ordering is deliberate: a person who tried to bring someone
 * along and never got to watching tells us more about the product's central
 * failure than a person for whom everything worked.
 */
const SIGNAL_PRIORITY: Readonly<Record<InterviewSignal, number>> = Object.freeze({
  invited_but_never_watched: 100,
  repeated_reconnect_failure: 80,
  watched_but_never_returned: 60,
  used_manual_sync: 40,
  used_voice: 30,
  activated: 20,
});

export const REPEATED_RECONNECT_FAILURES = 2;

export interface InterviewCandidate {
  readonly cohortId: string;
  readonly activated: boolean;
  readonly invitedGuest: boolean;
  readonly reachedWatching: boolean;
  readonly returned: boolean;
  readonly usedVoice: boolean;
  readonly usedManualSync: boolean;
  readonly reconnectFailures: number;
}

export interface InterviewEntry {
  readonly cohortId: string;
  readonly signals: readonly InterviewSignal[];
  readonly priority: number;
}

export function candidateSignals(candidate: InterviewCandidate): readonly InterviewSignal[] {
  const signals: InterviewSignal[] = [];
  if (candidate.invitedGuest && !candidate.reachedWatching) {
    signals.push("invited_but_never_watched");
  }
  if (candidate.reconnectFailures >= REPEATED_RECONNECT_FAILURES) {
    signals.push("repeated_reconnect_failure");
  }
  if (candidate.reachedWatching && !candidate.returned) signals.push("watched_but_never_returned");
  if (candidate.usedManualSync) signals.push("used_manual_sync");
  if (candidate.usedVoice) signals.push("used_voice");
  if (candidate.activated) signals.push("activated");
  return signals;
}

/** Sorted by strongest signal, then by breadth of signals, then by id. */
export function buildInterviewQueue(
  candidates: readonly InterviewCandidate[],
): readonly InterviewEntry[] {
  return candidates
    .map((candidate) => {
      const signals = candidateSignals(candidate);
      const priority = signals.reduce(
        (highest, signal) => Math.max(highest, SIGNAL_PRIORITY[signal]),
        0,
      );
      return { cohortId: candidate.cohortId, signals, priority };
    })
    .filter((entry) => entry.signals.length > 0)
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.signals.length - a.signals.length ||
        a.cohortId.localeCompare(b.cohortId),
    );
}

/** The seven questions, held as localization keys so they stay translatable. */
export const INTERVIEW_QUESTIONS = [
  "what_were_you_watching",
  "first_confusing_step",
  "handoff_understandable",
  "everyone_knew_next_step",
  "chat_or_voice_value",
  "what_would_bring_you_back",
  "what_would_you_pay_for",
] as const;
export type InterviewQuestion = (typeof INTERVIEW_QUESTIONS)[number];
