/**
 * Po Planning Engine — Milestone H1 §3.
 *
 * Turns a resolved intent into an ordered plan of tool calls, or into the one
 * question that would make the plan possible, or into an honest refusal. It is
 * the only place where "what the person meant" becomes "what Po will do".
 *
 * Three rules shape everything here:
 * - a plan is only produced when every parameter is known; a missing one
 *   becomes a clarification, never a guess (Milestone H1 §10);
 * - preconditions are checked before planning, so Po refuses at the point it
 *   can explain why ("you're not in a room") rather than mid-execution;
 * - authority still belongs to the Domain. Planning consults read models to
 *   decide whether to ask; it never decides capacity, compliance, or
 *   permission itself (Build Rules §1).
 */
import { PO_DESTINATIONS } from "./po-lexicon";
import type { PoPlanResult, PoPlanned, PoPlannedStep, PoResolvedIntent } from "./po-brain.types";
import { findPoMemory } from "./po-memory";
import { loadPoHome, loadPoProviders, resolvePoPerson } from "./po-context";
import {
  chooseInvite,
  defaultRoomName,
  inviteRoomNames,
  isAlreadyFriend,
  isCurrentRoute,
  soleSelectableProvider,
} from "./po-situation";
import { findPoMemoryByText } from "./po-memory";
import { getPoRuntime, type PoRoomControls } from "./po-runtime";

function planId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `plan-${Date.now()}`;
}

let stepCounter = 0;
function stepId(): string {
  stepCounter += 1;
  return `step-${stepCounter}`;
}

function step(
  toolName: string,
  input: Record<string, unknown>,
  replyKey: string,
  requiresConfirmation = false,
): PoPlannedStep {
  return { id: stepId(), toolName, input, requiresConfirmation, replyKey };
}

function plan(
  intent: PoResolvedIntent,
  steps: readonly PoPlannedStep[],
  summaryKey: string,
  summaryValues?: Readonly<Record<string, string | number>>,
): PoPlanResult {
  return {
    kind: "plan",
    plan: {
      id: planId(),
      intent,
      steps,
      summaryKey,
      ...(summaryValues ? { summaryValues } : {}),
    } satisfies PoPlanned,
  };
}

function refuse(refusalKey: string, values?: Record<string, string | number>): PoPlanResult {
  return { kind: "refuse", refusal: { refusalKey, ...(values ? { values } : {}) } };
}

function clarify(
  slot: string,
  promptKey: string,
  values?: Record<string, string | number>,
): PoPlanResult {
  return { kind: "clarify", slot, promptKey, ...(values ? { values } : {}) };
}

function text(intent: PoResolvedIntent, slot: string): string | null {
  const value = intent.slots[slot];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Intents that only mean anything inside a room. */
const ROOM_SCOPED = new Set([
  "room.leave",
  "room.close",
  "room.set_ready",
  "room.status",
  "invite.create",
  "countdown.set_duration",
  "countdown.start",
  "countdown.cancel",
  "provider.select",
  "voice.join",
  "voice.leave",
  "voice.mute",
  "voice.unmute",
  "sync.status",
  "sync.resync",
]);

/** Intents only the host may carry out. The Domain enforces this too. */
const HOST_ONLY = new Set([
  "room.close",
  "countdown.set_duration",
  "countdown.start",
  "countdown.cancel",
  "provider.select",
]);

export async function planIntent(intent: PoResolvedIntent): Promise<PoPlanResult> {
  const runtime = getPoRuntime();
  const profileId = runtime.actor.profileId;
  if (!profileId) return refuse("po.refuse.signed_out");

  const room = runtime.room;
  if (ROOM_SCOPED.has(intent.name) && !room) return refuse("po.refuse.no_room");
  if (room && HOST_ONLY.has(intent.name) && !room.isHost) return refuse("po.refuse.host_only");

  switch (intent.name) {
    /* ── Rooms ─────────────────────────────────────────────────────────── */
    case "room.create": {
      // Milestone H1.5 §2 — a room does not need a name to exist, and the
      // person's own name is already known, so Po names it and moves on.
      const name = text(intent, "room_name") ?? defaultRoomName(runtime.actor.displayName);
      if (!name) return clarify("room_name", "po.ask.room_name");
      return plan(
        intent,
        [step("room.create", { name }, "po.done.room_created")],
        "po.plan.room_create",
        {
          name,
        },
      );
    }

    case "room.join_by_code": {
      const code = text(intent, "room_code");
      if (!code) return clarify("room_code", "po.ask.room_code");
      return plan(
        intent,
        [step("room.join_by_code", { code }, "po.done.room_joined")],
        "po.plan.room_join",
        { code },
      );
    }

    case "room.leave":
      return plan(
        intent,
        [step("room.leave", {}, "po.done.room_left", true)],
        "po.plan.room_leave",
      );

    case "room.close":
      return plan(
        intent,
        [step("room.close", {}, "po.done.room_closed", true)],
        "po.plan.room_close",
      );

    case "room.set_ready": {
      const ready = intent.slots["ready"];
      return plan(
        intent,
        [step("room.set_ready", { ready: ready === false ? false : true }, "po.done.ready_set")],
        "po.plan.ready",
      );
    }

    case "room.status":
      return plan(intent, [step("room.get_current", {}, "po.answer.room_status")], "po.plan.read");

    case "room.list_recent":
      return plan(intent, [step("room.list_recent", {}, "po.answer.recent_rooms")], "po.plan.read");

    /* ── Invitations ───────────────────────────────────────────────────── */
    case "invite.create": {
      const term = text(intent, "person");
      if (!term) return clarify("person", "po.ask.person");
      const { match, ambiguous, candidates } = await resolvePoPerson(profileId, term);
      if (ambiguous) {
        return clarify("person", "po.ask.which_person", {
          term,
          names: candidates.map((person) => person.handle || person.displayName).join(", "),
        });
      }
      if (!match) return refuse("po.refuse.person_unknown", { term });
      return plan(
        intent,
        [
          step(
            "invite.create",
            { inviteeProfileId: match.profileId, displayName: match.displayName },
            "po.done.invited",
          ),
        ],
        "po.plan.invite",
        { name: match.displayName, room: (room as PoRoomControls).roomName },
      );
    }

    case "invite.list_pending":
      return plan(
        intent,
        [step("invite.list_pending", {}, "po.answer.pending_invites")],
        "po.plan.read",
      );

    case "invite.accept":
    case "invite.decline": {
      const home = await loadPoHome(profileId);
      const pending = home?.pendingInvites ?? [];
      if (pending.length === 0) return refuse("po.refuse.no_invites");
      // Milestone H1.5 §2 — with one invitation there is nothing to ask; with
      // several, the room named in the utterance usually settles it, and only
      // a genuine tie becomes a question.
      const { invite: only, ambiguous: manyInvites } = chooseInvite(
        pending,
        text(intent, "room_name") ?? text(intent, "person"),
      );
      if (manyInvites) {
        return clarify("room_name", "po.ask.which_invite", { rooms: inviteRoomNames(pending) });
      }
      if (!only) return refuse("po.refuse.no_invites");
      const accepting = intent.name === "invite.accept";
      return plan(
        intent,
        [
          step(
            accepting ? "invite.accept" : "invite.decline",
            { inviteId: only.invite.id },
            accepting ? "po.done.invite_accepted" : "po.done.invite_declined",
          ),
        ],
        accepting ? "po.plan.invite_accept" : "po.plan.invite_decline",
        { room: only.room?.name ?? "" },
      );
    }

    /* ── Countdown ─────────────────────────────────────────────────────── */
    case "countdown.set_duration": {
      const seconds = intent.slots["seconds"];
      if (typeof seconds !== "number") return clarify("seconds", "po.ask.seconds");
      return plan(
        intent,
        [step("countdown.set_duration", { seconds }, "po.done.countdown_set")],
        "po.plan.countdown_set",
        { seconds },
      );
    }

    case "countdown.start": {
      const live = room as PoRoomControls;
      if (!live.providerId) return refuse("po.refuse.no_provider");
      if (!live.canStartCountdown) return refuse("po.refuse.sync_not_ready");
      const seconds = intent.slots["seconds"];
      const steps: PoPlannedStep[] =
        typeof seconds === "number" && seconds !== live.countdownSeconds
          ? [
              step("countdown.set_duration", { seconds }, "po.done.countdown_set"),
              step("countdown.start", {}, "po.done.countdown_started", true),
            ]
          : [step("countdown.start", {}, "po.done.countdown_started", true)];
      return plan(intent, steps, "po.plan.countdown_start", {
        seconds: typeof seconds === "number" ? seconds : live.countdownSeconds,
      });
    }

    case "countdown.cancel":
      return plan(
        intent,
        [step("countdown.cancel", {}, "po.done.countdown_cancelled")],
        "po.plan.countdown_cancel",
      );

    /* ── Providers ─────────────────────────────────────────────────────── */
    case "provider.list":
      return plan(intent, [step("provider.list", {}, "po.answer.providers")], "po.plan.read");

    case "provider.select": {
      let hint = text(intent, "provider_hint");
      if (!hint) {
        // Milestone H1.5 §2 — one selectable service means one possible answer.
        const sole = await soleSelectableProvider(profileId);
        hint = sole?.key ?? null;
      }
      if (!hint) return clarify("provider_hint", "po.ask.provider");
      const catalog = await loadPoProviders(profileId);
      if (!catalog) return refuse("po.refuse.providers_unavailable");
      const needle = hint.toLowerCase().replace(/[^a-z0-9+]/g, "");
      const option = catalog.options.find((entry) => {
        const key = entry.provider.key.toLowerCase().replace(/[^a-z0-9+]/g, "");
        const nameKey = entry.provider.displayNameKey.toLowerCase();
        return key.includes(needle) || needle.includes(key) || nameKey.includes(needle);
      });
      if (!option) return refuse("po.refuse.provider_unknown", { name: hint });
      /**
       * The catalogue already carries the region's compliance verdict. Po
       * refuses here so the person hears why, and the Domain refuses again at
       * execution — neither check is a substitute for the other.
       */
      if (option.complianceAction === "block" || !option.isSelectable) {
        return refuse("po.refuse.provider_blocked", { name: hint });
      }
      return plan(
        intent,
        [
          step(
            "room.select_provider",
            { providerId: option.provider.id },
            "po.done.provider_selected",
          ),
        ],
        "po.plan.provider_select",
        { name: hint },
      );
    }

    /* ── Voice ─────────────────────────────────────────────────────────── */
    case "voice.join":
      return plan(intent, [step("voice.join", {}, "po.done.voice_joined")], "po.plan.voice_join");

    case "voice.leave":
      return plan(intent, [step("voice.leave", {}, "po.done.voice_left")], "po.plan.voice_leave");

    case "voice.mute":
    case "voice.unmute": {
      const muted = intent.name === "voice.mute";
      return plan(
        intent,
        [step("voice.set_mute", { muted }, muted ? "po.done.muted" : "po.done.unmuted")],
        muted ? "po.plan.mute" : "po.plan.unmute",
      );
    }

    /* ── Synchronisation ───────────────────────────────────────────────── */
    case "sync.status":
      return plan(intent, [step("sync.get_quality", {}, "po.answer.sync")], "po.plan.read");

    case "sync.resync":
      return plan(intent, [step("sync.request_resync", {}, "po.done.resynced")], "po.plan.resync");

    /* ── Social ────────────────────────────────────────────────────────── */
    case "friend.list":
      return plan(intent, [step("friend.list", {}, "po.answer.friends")], "po.plan.read");

    case "partners.list":
      return plan(intent, [step("partners.list", {}, "po.answer.partners")], "po.plan.read");

    case "friend.search": {
      const term = text(intent, "person");
      if (!term) return clarify("person", "po.ask.person");
      return plan(intent, [step("friend.search", { term }, "po.answer.search")], "po.plan.read");
    }

    case "friend.request": {
      const term = text(intent, "person");
      if (!term) return clarify("person", "po.ask.person");
      const { match, ambiguous, candidates } = await resolvePoPerson(profileId, term);
      if (ambiguous) {
        return clarify("person", "po.ask.which_person", {
          term,
          names: candidates.map((person) => person.handle || person.displayName).join(", "),
        });
      }
      if (!match) return refuse("po.refuse.person_unknown", { term });
      // Already friends: saying so is more useful than sending a second request.
      if (await isAlreadyFriend(profileId, match.profileId)) {
        return refuse("po.refuse.already_friends", { name: match.displayName });
      }
      return plan(
        intent,
        [
          step(
            "friend.send_request",
            { targetProfileId: match.profileId, displayName: match.displayName },
            "po.done.friend_requested",
          ),
        ],
        "po.plan.friend_request",
        { name: match.displayName },
      );
    }

    /* ── Settings ──────────────────────────────────────────────────────── */
    case "settings.get":
      return plan(intent, [step("user.get_preferences", {}, "po.answer.settings")], "po.plan.read");

    case "settings.set": {
      const field = text(intent, "field");
      const enabled = intent.slots["enabled"];
      if (!field) return clarify("field", "po.ask.setting_field");
      if (typeof enabled !== "boolean") return clarify("enabled", "po.ask.setting_value");
      const mapped = SETTING_FIELD_MAP[field];
      if (!mapped) return refuse("po.refuse.setting_unknown", { field });
      return plan(
        intent,
        [step("user.set_preference", { field: mapped, enabled }, "po.done.setting_changed")],
        "po.plan.setting",
        { field, state: enabled ? "on" : "off" },
      );
    }

    /* ── Memory ────────────────────────────────────────────────────────── */
    case "memory.remember": {
      const note = text(intent, "note");
      if (!note) return clarify("note", "po.ask.note");
      // Milestone H1.5 §6 — prefer what is already remembered over storing it twice.
      if (findPoMemoryByText(profileId, note)) {
        return refuse("po.refuse.memory_known", { note });
      }
      return plan(
        intent,
        [step("memory.store", { summary: note }, "po.done.remembered")],
        "po.plan.remember",
        {
          note,
        },
      );
    }

    case "memory.list":
      return plan(intent, [step("memory.list", {}, "po.answer.memories")], "po.plan.read");

    case "memory.forget": {
      const fragment = text(intent, "note") ?? text(intent, "person");
      const found = fragment ? findPoMemory(profileId, fragment) : null;
      if (!found) return refuse("po.refuse.memory_unknown");
      return plan(
        intent,
        [
          step(
            "memory.delete",
            { memoryId: found.id, summary: found.summary },
            "po.done.forgotten",
          ),
        ],
        "po.plan.forget",
        { note: found.summary },
      );
    }

    /* ── Navigation and meta ───────────────────────────────────────────── */
    case "navigate.to": {
      const destination = text(intent, "destination");
      if (!destination) return clarify("destination", "po.ask.destination");
      const path = PO_DESTINATIONS[destination as keyof typeof PO_DESTINATIONS];
      if (!path) return refuse("po.refuse.destination_unknown", { destination });
      // Milestone H1.5 §1 — opening the screen already on screen is not help.
      if (isCurrentRoute(path)) return refuse("po.refuse.already_there", { destination });
      return plan(
        intent,
        [step("navigate.to", { path, destination }, "po.done.navigated")],
        "po.plan.navigate",
        { destination },
      );
    }

    case "home.overview":
      return plan(intent, [step("home.get_snapshot", {}, "po.answer.overview")], "po.plan.read");

    case "capability.list":
      return plan(intent, [step("capability.list", {}, "po.answer.capabilities")], "po.plan.read");

    default:
      return refuse("po.refuse.unknown");
  }
}

/** Lexicon field names to the preference fields the tool accepts. */
const SETTING_FIELD_MAP: Readonly<Record<string, string>> = Object.freeze({
  voice_auto_join: "voiceAutoJoin",
  voice_join_muted: "voiceJoinMuted",
  po_memory: "poMemoryOptIn",
});

/** Test-support only: keeps step ids stable across cases. */
export function resetPoStepCounter(): void {
  stepCounter = 0;
}
