/**
 * Product analytics for the watch party — Sprint H6.
 *
 * Privacy-safe by construction: an event carries a name, a room-scoped
 * correlation id, and a small bag of primitive facts. Message bodies, voice
 * audio, provider credentials, cookies, and titles never enter this file.
 *
 * This is product telemetry, not certification evidence. Nothing written here
 * is durable, and nothing here is admissible as a certification record.
 */

export const PRODUCT_EVENTS = [
  "room_created",
  "invite_copied",
  "invite_joined",
  "provider_selected",
  "media_selected",
  "countdown_started",
  "watch_started",
  "participant_ready",
  "voice_join_requested",
  "voice_connected",
  "voice_failed",
  "chat_message_sent",
  "reconnect_started",
  "reconnect_recovered",
  "room_closed",
  "participant_removed",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[number];

/** Only primitives survive; everything else is dropped rather than guessed. */
export type ProductEventValue = string | number | boolean | null;

export type ProductEventProps = Readonly<Record<string, ProductEventValue>>;

export interface ProductEvent {
  readonly name: ProductEventName;
  readonly at: string;
  readonly props: ProductEventProps;
}

/** Keys that must never be recorded, whatever a caller passes. */
const FORBIDDEN_KEYS = new Set([
  "body",
  "message",
  "text",
  "title",
  "url",
  "email",
  "password",
  "token",
  "cookie",
  "audio",
  "transcript",
  "contentReference",
]);

const MAX_STRING = 64;

/** Strips forbidden keys, non-primitive values, and long free text. */
export function sanitizeProps(input: Readonly<Record<string, unknown>>): ProductEventProps {
  const out: Record<string, ProductEventValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (value === null) {
      out[key] = null;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    } else if (typeof value === "string") {
      if (value.length > MAX_STRING) continue;
      out[key] = value;
    }
  }
  return out;
}

/* ---------------------------------------------------------- dev-only metrics */

export interface DevMetricsSnapshot {
  readonly roomCreatedToFirstGuestMs: number | null;
  readonly mediaSelectedToWatchMs: number | null;
  readonly voiceSuccessRate: number | null;
  readonly chatFailureRate: number | null;
  readonly reconnectRecoveryMs: number | null;
  readonly roomsReachingWatchPercent: number | null;
}

/**
 * Session-only counters used while developing. They never leave the tab and
 * are not written to storage or to the evidence tree.
 */
export interface DevMetricsRecorder {
  record(event: ProductEvent): void;
  snapshot(): DevMetricsSnapshot;
  reset(): void;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Number((numerator / denominator).toFixed(4));
}

export function createDevMetricsRecorder(): DevMetricsRecorder {
  let roomCreatedAt: number | null = null;
  let firstGuestMs: number | null = null;
  let mediaSelectedAt: number | null = null;
  let watchMs: number | null = null;
  let reconnectStartedAt: number | null = null;
  let reconnectMs: number | null = null;
  let voiceAttempts = 0;
  let voiceSuccesses = 0;
  let chatSends = 0;
  let chatFailures = 0;
  let roomsSeen = 0;
  let roomsWatched = 0;

  return {
    record(event) {
      const at = Date.parse(event.at);
      const now = Number.isFinite(at) ? at : Date.now();
      switch (event.name) {
        case "room_created":
          roomCreatedAt = now;
          roomsSeen += 1;
          break;
        case "invite_joined":
          if (roomCreatedAt !== null && firstGuestMs === null) firstGuestMs = now - roomCreatedAt;
          break;
        case "media_selected":
          mediaSelectedAt = now;
          break;
        case "watch_started":
          if (mediaSelectedAt !== null && watchMs === null) watchMs = now - mediaSelectedAt;
          roomsWatched += 1;
          break;
        case "voice_join_requested":
          voiceAttempts += 1;
          break;
        case "voice_connected":
          voiceSuccesses += 1;
          break;
        case "chat_message_sent":
          chatSends += 1;
          if (event.props["failed"] === true) chatFailures += 1;
          break;
        case "reconnect_started":
          reconnectStartedAt = now;
          break;
        case "reconnect_recovered":
          if (reconnectStartedAt !== null) reconnectMs = now - reconnectStartedAt;
          break;
        default:
          break;
      }
    },

    snapshot() {
      return {
        roomCreatedToFirstGuestMs: firstGuestMs,
        mediaSelectedToWatchMs: watchMs,
        voiceSuccessRate: ratio(voiceSuccesses, voiceAttempts),
        chatFailureRate: ratio(chatFailures, chatSends),
        reconnectRecoveryMs: reconnectMs,
        roomsReachingWatchPercent:
          roomsSeen === 0 ? null : Number(((roomsWatched / roomsSeen) * 100).toFixed(2)),
      };
    },

    reset() {
      roomCreatedAt = null;
      firstGuestMs = null;
      mediaSelectedAt = null;
      watchMs = null;
      reconnectStartedAt = null;
      reconnectMs = null;
      voiceAttempts = 0;
      voiceSuccesses = 0;
      chatSends = 0;
      chatFailures = 0;
      roomsSeen = 0;
      roomsWatched = 0;
    },
  };
}

export function productEvent(
  name: ProductEventName,
  props: Readonly<Record<string, unknown>> = {},
  at: string = new Date().toISOString(),
): ProductEvent {
  return { name, at, props: sanitizeProps(props) };
}
