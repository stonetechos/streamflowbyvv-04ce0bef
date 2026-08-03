/**
 * Po follow-ups — Milestone H1.5 §3.
 *
 * The one thing worth offering after something worked. Every rule here is
 * conditional on the situation Po can already see, so an offer only appears
 * when it is genuinely the next step: no friends means no offer to invite, a
 * room already in voice hears nothing about voice.
 *
 * A follow-up is a sentence, never an action. Po does not queue, schedule or
 * pre-plan anything from it, and the same offer is never repeated twice in a
 * row (Milestone H1.5 §3 — never interrupt unnecessarily).
 */
import { loadPoSocial } from "./po-context";
import { getPoRuntime } from "./po-runtime";
import type { PoMessage, PoResolvedIntent } from "./po-brain.types";

export async function followUpFor(
  intent: PoResolvedIntent,
  profileId: string | null,
): Promise<PoMessage | null> {
  const runtime = getPoRuntime();
  const room = runtime.room;

  switch (intent.name) {
    case "room.create": {
      // Worth offering only if there is somebody to invite.
      const overview = profileId ? await loadPoSocial(profileId) : null;
      const friendCount = overview?.friends.length ?? 0;
      return friendCount > 0 ? { key: "po.next.invite_friends" } : null;
    }

    case "invite.create":
      // A room with a service already chosen is ready to count down.
      return room?.isHost && room.providerId ? { key: "po.next.countdown" } : null;

    case "provider.select":
      return room?.isHost ? { key: "po.next.ready_check" } : null;

    case "countdown.start":
      return { key: "po.next.press_play" };

    case "room.join_by_code":
    case "invite.accept":
      return room?.voice.isAvailable && !room.voice.isConnected
        ? { key: "po.next.join_voice" }
        : null;

    case "friend.request":
      return { key: "po.next.invite_when_ready" };

    default:
      return null;
  }
}
