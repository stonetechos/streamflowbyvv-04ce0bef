/**
 * Closed-beta product analytics — Sprint H7.
 *
 * A privacy-safe funnel recorder. An event is a name, a small bag of
 * primitives, and a session context. Message bodies, voice audio, provider
 * credentials, cookies, invite tokens and precise location never enter here:
 * `sanitizeProps` drops anything that is not an allowed primitive, and the
 * forbidden-key list is enforced again on the context.
 *
 * This is product telemetry, not certification evidence. Nothing written here
 * is durable and nothing here is admissible as a certification record.
 */
import { sanitizeProps, type ProductEventName, type ProductEventProps } from "./room-analytics";

/* --------------------------------------------------------- event dictionary */

export const BETA_ACQUISITION_EVENTS = [
  "landing_viewed",
  "onboarding_started",
  "onboarding_completed",
  "onboarding_skipped",
  "create_room_clicked",
  "join_room_clicked",
] as const;

export const BETA_ACTIVATION_EVENTS = [
  "room_created",
  "invite_copied",
  "native_share_opened",
  "invite_opened",
  "guest_joined",
  "first_guest_joined",
  "provider_selected",
  "media_selection_started",
  "media_selected",
  "countdown_started",
  "countdown_completed",
  "watching_started",
  "room_reached_watching_with_host_and_guest",
] as const;

export const BETA_SOCIAL_EVENTS = [
  "voice_prompt_shown",
  "voice_permission_granted",
  "voice_permission_denied",
  "voice_connected",
  "voice_failed",
  "chat_opened",
  "chat_message_sent",
  "chat_send_failed",
  "participant_ready",
  "participant_removed",
  "room_locked",
  "room_closed",
] as const;

export const BETA_RELIABILITY_EVENTS = [
  "reconnect_started",
  "reconnect_recovered",
  "reconnect_failed",
  "stale_snapshot_rejected",
  "provider_launch_clicked",
  "manual_sync_requested",
  "room_start_failed",
] as const;

export const BETA_COMPLETION_EVENTS = [
  "session_ended",
  "room_left",
  "host_closed_room",
  "repeat_room_created",
  "session_summary_shown",
] as const;

/** Beta programme events: admission and research, never billing. */
export const BETA_PROGRAMME_EVENTS = [
  "beta_access_granted",
  "beta_access_denied",
  "research_prompt_shown",
  "research_response_submitted",
] as const;

/**
 * Sprint H9 — joining by room code. The code itself never travels with these
 * events; only the shape of what happened does.
 */
export const BETA_JOIN_CODE_EVENTS = [
  "join_by_code_opened",
  "room_code_viewed",
  "room_code_copied",
  "room_code_pasted",
  "room_code_submitted",
  "room_code_valid",
  "room_code_invalid",
  "room_code_expired",
  "room_code_revoked",
  "room_code_joined",
  "room_code_join_blocked",
] as const;

/** Sprint H9 — homepage arrangement. A provider key is not personal data. */
export const BETA_PERSONALIZATION_EVENTS = [
  "homepage_customize_opened",
  "provider_reordered",
  "provider_pinned",
  "provider_unpinned",
  "provider_hidden",
  "provider_unhidden",
  "provider_order_reset",
  "favorites_used_for_selection",
] as const;

export const BETA_EVENTS = [
  ...BETA_ACQUISITION_EVENTS,
  ...BETA_ACTIVATION_EVENTS,
  ...BETA_SOCIAL_EVENTS,
  ...BETA_RELIABILITY_EVENTS,
  ...BETA_COMPLETION_EVENTS,
  ...BETA_PROGRAMME_EVENTS,
  ...BETA_JOIN_CODE_EVENTS,
  ...BETA_PERSONALIZATION_EVENTS,
] as const;

export type BetaEventName = (typeof BETA_EVENTS)[number];

/** H6 names stay valid so earlier instrumentation keeps recording. */
export type AnalyticsEventName = BetaEventName | ProductEventName;

export function isBetaEvent(name: string): name is BetaEventName {
  return (BETA_EVENTS as readonly string[]).includes(name);
}

/* ------------------------------------------------------------- session shape */

export type RoomRoleLabel = "host" | "guest" | "visitor";
export type DeviceCategory = "mobile" | "tablet" | "desktop" | "unknown";

/**
 * The only identity an event carries. `sessionId` is generated per browser
 * session and never linked to an account, an email, or a device fingerprint.
 */
export interface AnalyticsContext {
  readonly sessionId: string;
  readonly role: RoomRoleLabel;
  readonly providerId: string | null;
  readonly syncMode: string | null;
  readonly platform: string;
  readonly deviceCategory: DeviceCategory;
  readonly appVersion: string;
  readonly roomPhase: string | null;
}

export interface BetaEvent {
  readonly name: AnalyticsEventName;
  readonly at: string;
  readonly context: AnalyticsContext;
  readonly props: ProductEventProps;
}

/** Events that must be counted once per session, however often they fire. */
const ONCE_PER_SESSION: ReadonlySet<string> = new Set([
  "landing_viewed",
  "onboarding_started",
  "onboarding_completed",
  "onboarding_skipped",
  "first_guest_joined",
  "session_ended",
]);

/** Events counted once per room, so a re-render never inflates the funnel. */
const ONCE_PER_ROOM: ReadonlySet<string> = new Set([
  "room_created",
  "guest_joined",
  "media_selected",
  "countdown_started",
  "countdown_completed",
  "watching_started",
  "room_reached_watching_with_host_and_guest",
  "room_closed",
  "room_left",
  "session_summary_shown",
]);

export function dedupeKey(name: AnalyticsEventName, roomKey: string | null): string | null {
  if (ONCE_PER_SESSION.has(name)) return `session:${name}`;
  if (ONCE_PER_ROOM.has(name)) return roomKey === null ? null : `room:${roomKey}:${name}`;
  return null;
}

/* -------------------------------------------------------------- funnel model */

export interface FunnelCounts {
  readonly landingViewed: number;
  readonly roomsCreated: number;
  readonly roomsWithInvite: number;
  readonly invitesOpened: number;
  readonly guestsJoined: number;
  readonly roomsWithGuest: number;
  readonly mediaSelected: number;
  readonly countdownsStarted: number;
  readonly watchingStarted: number;
  readonly countdownsCompleted: number;
  readonly roomsActivated: number;
  readonly voiceConnected: number;
  readonly voiceAttempts: number;
  readonly chatSends: number;
  readonly chatFailures: number;
  readonly providerLaunches: number;
  readonly reconnectsStarted: number;
  readonly reconnectsRecovered: number;
  readonly repeatRoomsCreated: number;
}

export const EMPTY_FUNNEL: FunnelCounts = Object.freeze({
  landingViewed: 0,
  roomsCreated: 0,
  roomsWithInvite: 0,
  invitesOpened: 0,
  guestsJoined: 0,
  roomsWithGuest: 0,
  mediaSelected: 0,
  countdownsStarted: 0,
  watchingStarted: 0,
  countdownsCompleted: 0,
  roomsActivated: 0,
  voiceConnected: 0,
  voiceAttempts: 0,
  chatSends: 0,
  chatFailures: 0,
  providerLaunches: 0,
  reconnectsStarted: 0,
  reconnectsRecovered: 0,
  repeatRoomsCreated: 0,
});

/**
 * The ten beta funnel rates. A rate with no denominator is `null` — never
 * zero, and never a target: no goal exists before beta data does.
 */
export interface FunnelMetrics {
  readonly landingToRoomCreation: number | null;
  readonly roomCreationToInvite: number | null;
  readonly inviteOpenToGuestJoin: number | null;
  readonly roomWithGuest: number | null;
  readonly guestJoinToContentSelection: number | null;
  readonly contentSelectionToCountdown: number | null;
  readonly countdownToWatching: number | null;
  readonly watchingToVoiceConnection: number | null;
  readonly reconnectRecovery: number | null;
  readonly roomRepeatCreation: number | null;
}

export function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Number((numerator / denominator).toFixed(4));
}

export function computeFunnel(counts: FunnelCounts): FunnelMetrics {
  return {
    landingToRoomCreation: rate(counts.roomsCreated, counts.landingViewed),
    roomCreationToInvite: rate(counts.roomsWithInvite, counts.roomsCreated),
    inviteOpenToGuestJoin: rate(counts.guestsJoined, counts.invitesOpened),
    roomWithGuest: rate(counts.roomsWithGuest, counts.roomsCreated),
    guestJoinToContentSelection: rate(counts.mediaSelected, counts.guestsJoined),
    contentSelectionToCountdown: rate(counts.countdownsStarted, counts.mediaSelected),
    countdownToWatching: rate(counts.watchingStarted, counts.countdownsStarted),
    watchingToVoiceConnection: rate(counts.voiceConnected, counts.watchingStarted),
    reconnectRecovery: rate(counts.reconnectsRecovered, counts.reconnectsStarted),
    roomRepeatCreation: rate(counts.repeatRoomsCreated, counts.roomsCreated),
  };
}

/* ----------------------------------------------------------------- recorder */

export interface BetaAnalyticsSnapshot {
  readonly counts: FunnelCounts;
  readonly metrics: FunnelMetrics;
  readonly counters: Readonly<Record<string, number>>;
  readonly recent: readonly BetaEvent[];
}

export interface BetaAnalyticsRecorder {
  /** Returns the recorded event, or null when it was deduplicated. */
  record(
    name: AnalyticsEventName,
    context: AnalyticsContext,
    props?: Readonly<Record<string, unknown>>,
    at?: string,
    roomKey?: string | null,
  ): BetaEvent | null;
  snapshot(): BetaAnalyticsSnapshot;
  reset(): void;
}

const RECENT_LIMIT = 60;

/** Context is data too: the same key filter applies before anything is kept. */
export function sanitizeContext(context: AnalyticsContext): AnalyticsContext {
  const safe = sanitizeProps({ ...context }) as Partial<Record<keyof AnalyticsContext, unknown>>;
  return {
    sessionId: typeof safe.sessionId === "string" ? safe.sessionId : "anonymous",
    role: (safe.role as RoomRoleLabel) ?? "visitor",
    providerId: typeof safe.providerId === "string" ? safe.providerId : null,
    syncMode: typeof safe.syncMode === "string" ? safe.syncMode : null,
    platform: typeof safe.platform === "string" ? safe.platform : "unknown",
    deviceCategory: (safe.deviceCategory as DeviceCategory) ?? "unknown",
    appVersion: typeof safe.appVersion === "string" ? safe.appVersion : "unknown",
    roomPhase: typeof safe.roomPhase === "string" ? safe.roomPhase : null,
  };
}

export function createBetaAnalytics(): BetaAnalyticsRecorder {
  let counters: Record<string, number> = {};
  let seen = new Set<string>();
  let roomsCreated = 0;
  let roomsWithInvite = new Set<string>();
  let roomsWithGuest = new Set<string>();
  let recent: BetaEvent[] = [];

  function bump(name: string): void {
    counters[name] = (counters[name] ?? 0) + 1;
  }

  return {
    record(name, context, props = {}, at = new Date().toISOString(), roomKey = null) {
      const key = dedupeKey(name, roomKey);
      if (key !== null) {
        if (seen.has(key)) return null;
        seen.add(key);
      }

      const event: BetaEvent = {
        name,
        at,
        context: sanitizeContext(context),
        props: sanitizeProps(props),
      };
      bump(name);
      if (name === "room_created") roomsCreated += 1;
      if (roomKey !== null) {
        if (name === "invite_copied" || name === "native_share_opened")
          roomsWithInvite.add(roomKey);
        if (name === "guest_joined") roomsWithGuest.add(roomKey);
      }
      recent = [event, ...recent].slice(0, RECENT_LIMIT);
      return event;
    },

    snapshot() {
      const counts: FunnelCounts = {
        landingViewed: counters["landing_viewed"] ?? 0,
        roomsCreated,
        roomsWithInvite: roomsWithInvite.size,
        invitesOpened: counters["invite_opened"] ?? 0,
        guestsJoined: counters["guest_joined"] ?? 0,
        roomsWithGuest: roomsWithGuest.size,
        mediaSelected: counters["media_selected"] ?? 0,
        countdownsStarted: counters["countdown_started"] ?? 0,
        watchingStarted: counters["watching_started"] ?? 0,
        countdownsCompleted: counters["countdown_completed"] ?? 0,
        roomsActivated: counters["room_reached_watching_with_host_and_guest"] ?? 0,
        voiceConnected: counters["voice_connected"] ?? 0,
        voiceAttempts:
          (counters["voice_connected"] ?? 0) +
          (counters["voice_failed"] ?? 0) +
          (counters["voice_permission_denied"] ?? 0),
        chatSends: counters["chat_message_sent"] ?? 0,
        chatFailures: counters["chat_send_failed"] ?? 0,
        providerLaunches: counters["provider_launch_clicked"] ?? 0,
        reconnectsStarted: counters["reconnect_started"] ?? 0,
        reconnectsRecovered: counters["reconnect_recovered"] ?? 0,
        repeatRoomsCreated: counters["repeat_room_created"] ?? 0,
      };
      return { counts, metrics: computeFunnel(counts), counters: { ...counters }, recent: recent };
    },

    reset() {
      counters = {};
      seen = new Set();
      roomsCreated = 0;
      roomsWithInvite = new Set();
      roomsWithGuest = new Set();
      recent = [];
    },
  };
}

/* ------------------------------------------------ reliability and engagement */

/**
 * Reliability rates the beta watches for regressions. Same rule as the funnel:
 * an undefined denominator is `null`, never a reassuring zero.
 */
export interface ReliabilityMetrics {
  readonly inviteOpenSuccess: number | null;
  readonly guestJoinSuccess: number | null;
  readonly countdownCompletion: number | null;
  readonly reconnectRecovery: number | null;
  readonly voiceConnectionSuccess: number | null;
  readonly chatSendFailure: number | null;
  readonly providerLaunchAction: number | null;
}

export function computeReliability(counts: FunnelCounts): ReliabilityMetrics {
  return {
    inviteOpenSuccess: rate(counts.invitesOpened, counts.roomsWithInvite),
    guestJoinSuccess: rate(counts.guestsJoined, counts.invitesOpened),
    countdownCompletion: rate(counts.countdownsCompleted, counts.countdownsStarted),
    reconnectRecovery: rate(counts.reconnectsRecovered, counts.reconnectsStarted),
    voiceConnectionSuccess: rate(counts.voiceConnected, counts.voiceAttempts),
    chatSendFailure: rate(counts.chatFailures, counts.chatSends),
    providerLaunchAction: rate(counts.providerLaunches, counts.mediaSelected),
  };
}

/** The activation rate as the beta defines it: activated rooms over rooms. */
export function activationRate(counts: FunnelCounts): number | null {
  return rate(counts.roomsActivated, counts.roomsCreated);
}
