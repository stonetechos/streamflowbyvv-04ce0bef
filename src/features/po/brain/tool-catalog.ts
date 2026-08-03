/**
 * Po tool catalog — Milestone H1 §4.
 *
 * Every capability Po has, and the complete list of them. A tool is a thin
 * facade: it validates its input, calls one Domain service or one live room
 * control, and returns plain data. No tool contains a rule — capacity,
 * lifecycle, invite validity, compliance and concurrency all remain the
 * Domain's decisions, and a tool that disagreed with the Domain would be a bug
 * (Build Rules §1, ADR-001 §9).
 *
 * Because Po can only ever call a registered tool, this file is also the
 * boundary of what Po can do. Nothing outside it is reachable by conversation.
 */
import {
  PROFILE_SERVICE,
  PROVIDER_CATALOG_SERVICE,
  ROOM_FLOW_SERVICE,
  ROOM_SETUP_SERVICE,
  SOCIAL_SERVICE,
  isServiceBound,
  normalizeCountdownSeconds,
  resolveService,
} from "@/domain";

import { registerPoTool, isPoToolRegistered, listPoTools } from "../tool-registry";
import type { PoToolDescriptor } from "../po.types";
import {
  invalidatePoContext,
  loadPoHome,
  loadPoProviders,
  loadPoSettings,
  loadPoSocial,
} from "./po-context";
import { deletePoMemory, listPoMemories, storePoMemory } from "./po-memory";
import { canPoNavigate, getPoRuntime, type PoRoomControls } from "./po-runtime";

/* ------------------------------------------------------------------ */
/* Input helpers                                                       */
/* ------------------------------------------------------------------ */

/** A tool refuses bad input loudly; the executor turns this into a reply. */
export class PoToolInputError extends Error {
  constructor(readonly field: string) {
    super(`Po tool input invalid: ${field}`);
    this.name = "PoToolInputError";
  }
}

/** Raised when the capability exists but nothing is bound to serve it. */
export class PoToolUnavailableError extends Error {
  constructor(readonly capability: string) {
    super(`Po capability unavailable: ${capability}`);
    this.name = "PoToolUnavailableError";
  }
}

type Raw = Record<string, unknown>;

function record(raw: unknown): Raw {
  if (typeof raw !== "object" || raw === null) throw new PoToolInputError("input");
  return raw as Raw;
}

function str(raw: unknown, field: string): string {
  const value = record(raw)[field];
  if (typeof value !== "string" || value.trim().length === 0) throw new PoToolInputError(field);
  return value.trim();
}

function optionalStr(raw: unknown, field: string): string | null {
  const value = record(raw)[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function bool(raw: unknown, field: string): boolean {
  const value = record(raw)[field];
  if (typeof value !== "boolean") throw new PoToolInputError(field);
  return value;
}

function num(raw: unknown, field: string): number {
  const value = record(raw)[field];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new PoToolInputError(field);
  return value;
}

const NO_INPUT = (): Record<string, never> => ({});

/* ------------------------------------------------------------------ */
/* Ambient accessors                                                   */
/* ------------------------------------------------------------------ */

function actorId(): string {
  const id = getPoRuntime().actor.profileId;
  if (!id) throw new PoToolUnavailableError("signed_in");
  return id;
}

function intent(): { correlationId: string; actorProfileId: string } {
  return { correlationId: crypto.randomUUID(), actorProfileId: actorId() };
}

function liveRoom(): PoRoomControls {
  const room = getPoRuntime().room;
  if (!room) throw new PoToolUnavailableError("live_room");
  return room;
}

function roomFlow() {
  if (!isServiceBound(ROOM_FLOW_SERVICE)) throw new PoToolUnavailableError("rooms");
  return resolveService(ROOM_FLOW_SERVICE);
}

function roomSetup() {
  if (!isServiceBound(ROOM_SETUP_SERVICE)) throw new PoToolUnavailableError("room_setup");
  const setup = resolveService(ROOM_SETUP_SERVICE);
  if (!setup.isAvailable()) throw new PoToolUnavailableError("room_setup");
  return setup;
}

function socialService() {
  if (!isServiceBound(SOCIAL_SERVICE)) throw new PoToolUnavailableError("social");
  const social = resolveService(SOCIAL_SERVICE);
  if (!social.isConfigured) throw new PoToolUnavailableError("social");
  return social;
}

function profileService() {
  if (!isServiceBound(PROFILE_SERVICE)) throw new PoToolUnavailableError("settings");
  const profiles = resolveService(PROFILE_SERVICE);
  if (!profiles.isConfigured) throw new PoToolUnavailableError("settings");
  return profiles;
}

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

function define<TInput, TOutput>(
  tool: PoToolDescriptor<TInput, TOutput>,
): PoToolDescriptor<TInput, TOutput> {
  return tool;
}

/** Public shapes the planner and reply builder read back. */
export interface PoRoomRef {
  readonly roomId: string;
  readonly roomCode: string;
  readonly roomName: string;
}

const READ_TOOLS: readonly PoToolDescriptor<never, unknown>[] = [
  define({
    name: "home.get_snapshot",
    description: "Reads what the person can do right now: live rooms, invitations, recent rooms.",
    category: "informational",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    async execute() {
      const home = await loadPoHome(actorId());
      return {
        liveRoomCount: home?.liveRooms.length ?? 0,
        pendingInviteCount: home?.pendingInvites.length ?? 0,
        recentRoomCount: home?.recentRooms.length ?? 0,
        continueRoomName: home?.continueRoom?.room.name ?? null,
        continueRoomId: home?.continueRoom?.room.id ?? null,
        isFirstTime: home?.isFirstTime ?? true,
      };
    },
  }),

  define({
    name: "room.get_current",
    description: "Describes the room the person is in: members, provider, readiness, countdown.",
    category: "informational",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    execute: async () => {
      const room = liveRoom();
      return {
        roomName: room.roomName,
        roomCode: room.roomCode,
        memberCount: room.memberCount,
        readyCount: room.readyCount,
        isHost: room.isHost,
        providerId: room.providerId,
        countdownSeconds: room.countdownSeconds,
        countdownState: room.countdownState,
      };
    },
  }),

  define({
    name: "room.list_recent",
    description: "Lists the rooms this person was recently in.",
    category: "informational",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    async execute() {
      const home = await loadPoHome(actorId());
      const rooms = (home?.recentRooms ?? []).slice(0, 5).map((entry) => entry.room.name);
      return { count: rooms.length, names: rooms };
    },
  }),

  define({
    name: "invite.list_pending",
    description: "Lists invitations waiting for an answer.",
    category: "informational",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    async execute() {
      const home = await loadPoHome(actorId());
      const pending = home?.pendingInvites ?? [];
      const first = pending[0];
      return {
        count: pending.length,
        firstInviteId: first?.invite.id ?? null,
        firstRoomName: first?.room?.name ?? null,
      };
    },
  }),

  define({
    name: "friend.list",
    description: "Lists friends and any pending friend requests.",
    category: "informational",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    async execute() {
      const social = await loadPoSocial(actorId());
      return {
        friendCount: social?.friends.length ?? 0,
        incomingCount: social?.incomingRequests.length ?? 0,
        names: (social?.friends ?? []).slice(0, 5).map((person) => person.displayName),
      };
    },
  }),

  define({
    name: "friend.search",
    description: "Finds people by name, handle, or profile code.",
    category: "informational",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ term: str(raw, "term") }),
    async execute({ term }: { term: string }) {
      const results = await socialService().searchProfiles(term, actorId());
      return {
        count: results.length,
        names: results.slice(0, 5).map((person) => person.displayName),
        firstProfileId: results[0]?.id ?? null,
      };
    },
  }),

  define({
    name: "partners.list",
    description: "Lists the people this person watches with most recently.",
    category: "informational",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    async execute() {
      const social = await loadPoSocial(actorId());
      const partners = (social?.recentPartners ?? []).slice(0, 5);
      return { count: partners.length, names: partners.map((person) => person.displayName) };
    },
  }),

  define({
    name: "provider.list",
    description: "Lists the services that can be selected in the current region.",
    category: "informational",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    async execute() {
      const catalog = await loadPoProviders(actorId());
      const selectable = (catalog?.options ?? []).filter((option) => option.isSelectable);
      return {
        count: selectable.length,
        names: selectable.slice(0, 6).map((option) => option.provider.displayNameKey),
      };
    },
  }),

  define({
    name: "sync.get_quality",
    description: "Reports how healthy synchronisation is in the current room.",
    category: "informational",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    execute: async () => {
      const room = liveRoom();
      return { health: room.syncHealth, canStartCountdown: room.canStartCountdown };
    },
  }),

  define({
    name: "user.get_preferences",
    description: "Reads the person's voice, notification and privacy preferences.",
    category: "settings",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    async execute() {
      const settings = await loadPoSettings(actorId());
      if (!settings) throw new PoToolUnavailableError("settings");
      return {
        voiceAutoJoin: settings.privacy.voiceAutoJoin,
        voiceJoinMuted: settings.privacy.voiceJoinMuted,
        poMemoryOptIn: settings.privacy.poMemoryOptIn,
        analyticsOptIn: settings.privacy.analyticsOptIn,
        inAppNotifications: settings.notifications.inAppEnabled,
        languageCode: settings.localization.languageCode,
      };
    },
  }),

  define({
    name: "memory.list",
    description: "Lists what the person has explicitly asked Po to remember.",
    category: "settings",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    execute: async () => {
      const memories = listPoMemories(getPoRuntime().actor.profileId);
      return { count: memories.length, summaries: memories.map((entry) => entry.summary) };
    },
  }),

  define({
    name: "capability.list",
    description: "Explains what Po can do.",
    category: "informational",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    execute: async () => ({ toolCount: listPoTools().length }),
  }),
] as unknown as readonly PoToolDescriptor<never, unknown>[];

const ACTION_TOOLS: readonly PoToolDescriptor<never, unknown>[] = [
  define({
    name: "room.create",
    description: "Creates a private room with the given name.",
    category: "room_control",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ name: str(raw, "name") }),
    async execute({ name }: { name: string }) {
      const result = await roomFlow().createRoom(
        { hostProfileId: actorId(), name, visibility: "private" },
        intent(),
      );
      invalidatePoContext("home");
      return {
        roomId: result.room.id,
        roomCode: result.room.code,
        roomName: result.room.name,
      } satisfies PoRoomRef;
    },
  }),

  define({
    name: "room.join_by_code",
    description: "Joins an existing room using its room code.",
    category: "room_control",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ code: str(raw, "code") }),
    async execute({ code }: { code: string }) {
      const flow = roomFlow();
      const room = await flow.discoverRoomByCode(code);
      await flow.joinRoom({ roomId: room.roomId, profileId: actorId() }, intent());
      invalidatePoContext("home");
      return { roomId: room.roomId, roomCode: code, roomName: room.name } satisfies PoRoomRef;
    },
  }),

  define({
    name: "room.leave",
    description: "Leaves the room the person is currently in.",
    category: "room_control",
    requiresComplianceCheck: false,
    requiresConfirmation: true,
    parseInput: NO_INPUT,
    async execute() {
      const room = liveRoom();
      await roomFlow().leaveRoom({ roomId: room.roomId, profileId: actorId() }, intent());
      invalidatePoContext("home");
      return { roomName: room.roomName };
    },
  }),

  define({
    name: "room.close",
    description: "Ends the room for everyone. Host only.",
    category: "room_control",
    requiresComplianceCheck: false,
    requiresConfirmation: true,
    parseInput: NO_INPUT,
    async execute() {
      const room = liveRoom();
      await roomFlow().endRoom(
        { roomId: room.roomId, actorProfileId: actorId(), endReason: "host_ended" },
        intent(),
      );
      invalidatePoContext("home");
      return { roomName: room.roomName };
    },
  }),

  define({
    name: "room.set_ready",
    description: "Marks the person ready, or not ready, in the current room.",
    category: "room_control",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ ready: bool(raw, "ready") }),
    execute: async ({ ready }: { ready: boolean }) => {
      liveRoom().setReady(ready);
      return { ready };
    },
  }),

  define({
    name: "room.select_provider",
    description: "Chooses the streaming service for the current room. Host only.",
    category: "provider_action",
    /** Provider-touching: the Domain issues a compliance verdict (Foundation §11). */
    requiresComplianceCheck: true,
    requiresConfirmation: false,
    parseInput: (raw) => ({ providerId: str(raw, "providerId") }),
    async execute({ providerId }: { providerId: string }) {
      const room = liveRoom();
      const result = await roomSetup().selectProvider(
        { roomId: room.roomId, providerId, actorProfileId: actorId() },
        intent(),
      );
      invalidatePoContext("providers");
      return { providerId, syncMode: result.syncMode, verdict: result.complianceVerdict };
    },
  }),

  define({
    name: "invite.create",
    description: "Invites a known person into the current room.",
    category: "invitation",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({
      inviteeProfileId: str(raw, "inviteeProfileId"),
      displayName: optionalStr(raw, "displayName") ?? "",
    }),
    async execute({
      inviteeProfileId,
      displayName,
    }: {
      inviteeProfileId: string;
      displayName: string;
    }) {
      const room = liveRoom();
      await roomFlow().createInvite(
        {
          roomId: room.roomId,
          inviterProfileId: actorId(),
          channel: "in_app",
          inviteeProfileId,
        },
        intent(),
      );
      invalidatePoContext("home");
      return { displayName, roomName: room.roomName };
    },
  }),

  define({
    name: "invite.accept",
    description: "Accepts a pending invitation.",
    category: "invitation",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ inviteId: str(raw, "inviteId") }),
    async execute({ inviteId }: { inviteId: string }) {
      const { member } = await roomFlow().acceptInvite(
        { inviteId, profileId: actorId() },
        intent(),
      );
      invalidatePoContext("home");
      return { roomId: member.roomId };
    },
  }),

  define({
    name: "invite.decline",
    description: "Declines a pending invitation.",
    category: "invitation",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ inviteId: str(raw, "inviteId") }),
    async execute({ inviteId }: { inviteId: string }) {
      await roomFlow().declineInvite({ inviteId, profileId: actorId() }, intent());
      invalidatePoContext("home");
      return { declined: true };
    },
  }),

  define({
    name: "countdown.set_duration",
    description: "Sets how long the shared countdown runs. Host only.",
    category: "playback_sync",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ seconds: num(raw, "seconds") }),
    async execute({ seconds }: { seconds: number }) {
      const room = liveRoom();
      const applied = normalizeCountdownSeconds(seconds);
      await roomSetup().setCountdownSeconds(room.roomId, applied, actorId());
      return { seconds: applied, requested: seconds, wasClamped: applied !== seconds };
    },
  }),

  define({
    name: "countdown.start",
    description: "Starts the shared countdown so everyone presses play together.",
    category: "playback_sync",
    requiresComplianceCheck: false,
    requiresConfirmation: true,
    parseInput: NO_INPUT,
    execute: async () => {
      const room = liveRoom();
      if (!room.canStartCountdown) throw new PoToolUnavailableError("countdown_not_ready");
      room.startCountdown();
      return { seconds: room.countdownSeconds };
    },
  }),

  define({
    name: "countdown.cancel",
    description: "Cancels a running countdown.",
    category: "playback_sync",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    execute: async () => {
      liveRoom().cancelCountdown();
      return { cancelled: true };
    },
  }),

  define({
    name: "sync.request_resync",
    description: "Re-measures the shared clock and reports sync health again.",
    category: "playback_sync",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    execute: async () => {
      const room = liveRoom();
      room.remeasureSync();
      return { health: room.syncHealth };
    },
  }),

  define({
    name: "voice.join",
    description: "Joins the room's voice channel.",
    category: "voice_control",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    execute: async () => {
      const room = liveRoom();
      if (!room.voice.isAvailable) throw new PoToolUnavailableError("voice");
      room.joinVoice();
      return { joined: true };
    },
  }),

  define({
    name: "voice.leave",
    description: "Leaves the room's voice channel.",
    category: "voice_control",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: NO_INPUT,
    execute: async () => {
      liveRoom().leaveVoice();
      return { left: true };
    },
  }),

  define({
    name: "voice.set_mute",
    description: "Mutes or unmutes the person's microphone.",
    category: "voice_control",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ muted: bool(raw, "muted") }),
    execute: async ({ muted }: { muted: boolean }) => {
      const room = liveRoom();
      if (!room.voice.isConnected) throw new PoToolUnavailableError("voice_connection");
      room.setMuted(muted);
      return { muted };
    },
  }),

  define({
    name: "friend.send_request",
    description: "Sends a friend request to a person.",
    category: "invitation",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({
      targetProfileId: str(raw, "targetProfileId"),
      displayName: optionalStr(raw, "displayName") ?? "",
    }),
    async execute({
      targetProfileId,
      displayName,
    }: {
      targetProfileId: string;
      displayName: string;
    }) {
      await socialService().sendRequest(actorId(), targetProfileId);
      invalidatePoContext("social");
      return { displayName };
    },
  }),

  define({
    name: "user.set_preference",
    description: "Changes one voice, notification or privacy preference.",
    category: "settings",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ field: str(raw, "field"), enabled: bool(raw, "enabled") }),
    async execute({ field, enabled }: { field: string; enabled: boolean }) {
      const profiles = profileService();
      const id = actorId();
      switch (field) {
        case "voiceAutoJoin":
        case "voiceJoinMuted":
        case "voicePushToTalk":
        case "poMemoryOptIn":
        case "analyticsOptIn":
          await profiles.updateSettings(id, { privacy: { [field]: enabled } }, intent());
          break;
        case "inAppEnabled":
        case "pushEnabled":
        case "emailEnabled":
          await profiles.updateSettings(id, { notifications: { [field]: enabled } }, intent());
          break;
        default:
          throw new PoToolInputError("field");
      }
      invalidatePoContext("settings");
      return { field, enabled };
    },
  }),

  define({
    name: "memory.store",
    description: "Remembers something the person explicitly asked Po to remember.",
    category: "settings",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ summary: str(raw, "summary") }),
    async execute({ summary }: { summary: string }) {
      const id = actorId();
      const settings = await loadPoSettings(id);
      /** Consent is a stored preference, never assumed (ADR-001 §11). */
      if (!settings?.privacy.poMemoryOptIn) throw new PoToolUnavailableError("memory_opt_in");
      const stored = storePoMemory(id, summary);
      if (!stored) throw new PoToolInputError("summary");
      return { summary: stored.summary };
    },
  }),

  define({
    name: "memory.delete",
    description: "Forgets one thing Po was asked to remember.",
    category: "settings",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ memoryId: str(raw, "memoryId"), summary: optionalStr(raw, "summary") }),
    execute: async ({ memoryId, summary }: { memoryId: string; summary: string | null }) => {
      const removed = deletePoMemory(getPoRuntime().actor.profileId, memoryId);
      if (!removed) throw new PoToolInputError("memoryId");
      return { summary: summary ?? "" };
    },
  }),

  define({
    name: "navigate.to",
    description: "Opens a screen in the app.",
    category: "informational",
    requiresComplianceCheck: false,
    requiresConfirmation: false,
    parseInput: (raw) => ({ path: str(raw, "path"), destination: str(raw, "destination") }),
    execute: async ({ path, destination }: { path: string; destination: string }) => {
      if (!canPoNavigate()) throw new PoToolUnavailableError("navigation");
      getPoRuntime().navigate(path);
      return { destination };
    },
  }),
] as unknown as readonly PoToolDescriptor<never, unknown>[];

/**
 * Registers the catalog once. Registration is idempotent so hot reload and
 * repeated provider mounts do not throw on the duplicate-name guard.
 */
export function registerPoBrainTools(): void {
  for (const tool of [...READ_TOOLS, ...ACTION_TOOLS]) {
    if (!isPoToolRegistered(tool.name)) registerPoTool(tool);
  }
}

export const PO_TOOL_NAMES: readonly string[] = [...READ_TOOLS, ...ACTION_TOOLS].map(
  (tool) => tool.name,
);
