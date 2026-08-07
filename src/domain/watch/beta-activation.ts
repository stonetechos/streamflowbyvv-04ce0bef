/**
 * Beta activation definition — Sprint H8.
 *
 * The beta asks one question: can a new person create a room, get someone
 * else into it, choose something, and actually reach watching without help?
 *
 * A room is activated only when all five facts hold at once. Anything weaker —
 * a room that was created, a link that was copied, a provider that was picked,
 * a countdown that was started but never finished, a host watching alone — is
 * explicitly not activation. Those are steps on the way, and counting them as
 * success is how a beta lies to itself.
 */
import type { RoomPhase } from "./watch-source";

export const ACTIVATION_EVENT = "room_reached_watching_with_host_and_guest" as const;
export type ActivationEventName = typeof ACTIVATION_EVENT;

export interface ActivationFacts {
  readonly hasHost: boolean;
  /** Participants other than the host who actually joined. */
  readonly guestCount: number;
  readonly hasValidMedia: boolean;
  readonly countdownCompleted: boolean;
  readonly phase: RoomPhase;
}

export const ACTIVATION_REQUIREMENTS = [
  "host_present",
  "guest_present",
  "valid_media",
  "countdown_completed",
  "phase_watching",
] as const;
export type ActivationRequirement = (typeof ACTIVATION_REQUIREMENTS)[number];

/** Which requirements are not yet met, in the order a room meets them. */
export function missingActivationRequirements(
  facts: ActivationFacts,
): readonly ActivationRequirement[] {
  const missing: ActivationRequirement[] = [];
  if (!facts.hasHost) missing.push("host_present");
  if (facts.guestCount < 1) missing.push("guest_present");
  if (!facts.hasValidMedia) missing.push("valid_media");
  if (!facts.countdownCompleted) missing.push("countdown_completed");
  if (facts.phase !== "watching") missing.push("phase_watching");
  return missing;
}

export function isRoomActivated(facts: ActivationFacts): boolean {
  return missingActivationRequirements(facts).length === 0;
}

/* --------------------------------------------------------------- timings */

/** Returns the middle value, averaging the two middles for an even count. */
export function medianOf(values: readonly number[]): number | null {
  const usable = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (usable.length === 0) return null;
  const middle = Math.floor(usable.length / 2);
  if (usable.length % 2 === 1) return usable[middle] as number;
  return Math.round((((usable[middle - 1] as number) + (usable[middle] as number)) / 2) * 100) / 100;
}

export interface RoomTimeline {
  readonly createdAt: number | null;
  readonly firstGuestAt: number | null;
  readonly mediaSelectedAt: number | null;
  readonly watchingAt: number | null;
  readonly endedAt: number | null;
}

export const EMPTY_TIMELINE: RoomTimeline = Object.freeze({
  createdAt: null,
  firstGuestAt: null,
  mediaSelectedAt: null,
  watchingAt: null,
  endedAt: null,
});

function span(from: number | null, to: number | null): number | null {
  if (from === null || to === null) return null;
  const value = to - from;
  return value >= 0 ? value : null;
}

export function timeToFirstGuest(timeline: RoomTimeline): number | null {
  return span(timeline.createdAt, timeline.firstGuestAt);
}

export function timeFromSelectionToWatching(timeline: RoomTimeline): number | null {
  return span(timeline.mediaSelectedAt, timeline.watchingAt);
}

export function sessionDuration(timeline: RoomTimeline): number | null {
  return span(timeline.createdAt, timeline.endedAt);
}

/* -------------------------------------------------------------- the tracker */

export interface ActivationRoomState {
  readonly roomKey: string;
  readonly activated: boolean;
  readonly timeline: RoomTimeline;
  readonly participants: number;
  readonly usedChat: boolean;
  readonly usedVoice: boolean;
  readonly reconnectFailures: number;
  readonly usedManualSync: boolean;
}

export interface ActivationSummary {
  readonly roomsTracked: number;
  readonly roomsActivated: number;
  readonly activationRate: number | null;
  readonly medianTimeToFirstGuestMs: number | null;
  readonly medianSelectionToWatchingMs: number | null;
  readonly medianSessionDurationMs: number | null;
  readonly averageParticipantsPerActivatedRoom: number | null;
  readonly chatUsageAmongActivated: number | null;
  readonly voiceUsageAmongActivated: number | null;
}

export interface ActivationTracker {
  /**
   * Records the current state of a room. Returns true exactly once per room:
   * on the transition into activation. Every later call returns false, so the
   * activation event can never be double counted.
   */
  observe(roomKey: string, facts: ActivationFacts, at?: number): boolean;
  mark(roomKey: string, moment: keyof RoomTimeline, at?: number): void;
  note(
    roomKey: string,
    fact: {
      readonly participants?: number;
      readonly usedChat?: boolean;
      readonly usedVoice?: boolean;
      readonly usedManualSync?: boolean;
      readonly reconnectFailure?: boolean;
    },
  ): void;
  rooms(): readonly ActivationRoomState[];
  summary(): ActivationSummary;
  reset(): void;
}

interface MutableRoom {
  activated: boolean;
  timeline: { -readonly [K in keyof RoomTimeline]: number | null };
  participants: number;
  usedChat: boolean;
  usedVoice: boolean;
  usedManualSync: boolean;
  reconnectFailures: number;
}

function emptyRoom(): MutableRoom {
  return {
    activated: false,
    timeline: { ...EMPTY_TIMELINE },
    participants: 0,
    usedChat: false,
    usedVoice: false,
    usedManualSync: false,
    reconnectFailures: 0,
  };
}

export function createActivationTracker(): ActivationTracker {
  let rooms = new Map<string, MutableRoom>();

  function ensure(roomKey: string): MutableRoom {
    const existing = rooms.get(roomKey);
    if (existing) return existing;
    const created = emptyRoom();
    rooms.set(roomKey, created);
    return created;
  }

  return {
    observe(roomKey, facts, at = Date.now()) {
      const room = ensure(roomKey);
      if (room.activated) return false;
      if (!isRoomActivated(facts)) return false;
      room.activated = true;
      if (room.timeline.watchingAt === null) room.timeline.watchingAt = at;
      room.participants = Math.max(room.participants, facts.guestCount + 1);
      return true;
    },

    mark(roomKey, moment, at = Date.now()) {
      const room = ensure(roomKey);
      // First occurrence wins: a re-render must not move a measured moment.
      if (room.timeline[moment] === null) room.timeline[moment] = at;
    },

    note(roomKey, fact) {
      const room = ensure(roomKey);
      if (fact.participants !== undefined) {
        room.participants = Math.max(room.participants, fact.participants);
      }
      if (fact.usedChat) room.usedChat = true;
      if (fact.usedVoice) room.usedVoice = true;
      if (fact.usedManualSync) room.usedManualSync = true;
      if (fact.reconnectFailure) room.reconnectFailures += 1;
    },

    rooms() {
      return [...rooms.entries()].map(([roomKey, room]) => ({
        roomKey,
        activated: room.activated,
        timeline: { ...room.timeline },
        participants: room.participants,
        usedChat: room.usedChat,
        usedVoice: room.usedVoice,
        usedManualSync: room.usedManualSync,
        reconnectFailures: room.reconnectFailures,
      }));
    },

    summary() {
      const all = [...rooms.values()];
      const activated = all.filter((room) => room.activated);
      const ratio = (numerator: number, denominator: number): number | null =>
        denominator <= 0 ? null : Number((numerator / denominator).toFixed(4));

      return {
        roomsTracked: all.length,
        roomsActivated: activated.length,
        activationRate: ratio(activated.length, all.length),
        medianTimeToFirstGuestMs: medianOf(
          all.map((room) => timeToFirstGuest(room.timeline)).filter((v): v is number => v !== null),
        ),
        medianSelectionToWatchingMs: medianOf(
          all
            .map((room) => timeFromSelectionToWatching(room.timeline))
            .filter((v): v is number => v !== null),
        ),
        medianSessionDurationMs: medianOf(
          all.map((room) => sessionDuration(room.timeline)).filter((v): v is number => v !== null),
        ),
        averageParticipantsPerActivatedRoom:
          activated.length === 0
            ? null
            : Number(
                (
                  activated.reduce((total, room) => total + room.participants, 0) / activated.length
                ).toFixed(2),
              ),
        chatUsageAmongActivated: ratio(
          activated.filter((room) => room.usedChat).length,
          activated.length,
        ),
        voiceUsageAmongActivated: ratio(
          activated.filter((room) => room.usedVoice).length,
          activated.length,
        ),
      };
    },

    reset() {
      rooms = new Map();
    },
  };
}
