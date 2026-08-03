/**
 * Po situation — Milestone H1.5 §1.
 *
 * The answers Po should already have. Everything here is derived from state
 * the application is holding anyway — the current path, the live room, the
 * home snapshot, the social overview, the provider catalogue — so the planner
 * can resolve a missing detail instead of asking a question whose answer is on
 * screen (Milestone H1.5 §2).
 *
 * It reads and derives. It decides nothing: capacity, compliance, permission
 * and every mutation still belong to the Domain (Build Rules §1), and no
 * helper here invents a value it could not see.
 */
import type { HomeInviteSummary } from "@/domain";

import { loadPoHome, loadPoProviders, loadPoSocial } from "./po-context";
import { getPoRuntime } from "./po-runtime";

/** A default room name, from the person's own name — never invented detail. */
export function defaultRoomName(displayName: string): string | null {
  const name = displayName.trim();
  if (name.length === 0) return null;
  const first = name.split(/\s+/)[0] ?? name;
  return `${first}'s room`;
}

/** True when the path Po would open is the path already on screen. */
export function isCurrentRoute(path: string): boolean {
  const here = getPoRuntime().route;
  if (path === "/") return here === "/";
  return here === path || here.startsWith(`${path}/`);
}

/**
 * Picks the invitation the person means. With one waiting there is nothing to
 * ask; with several, a room name in the utterance is enough to choose.
 */
export function chooseInvite(
  pending: readonly HomeInviteSummary[],
  hint: string | null,
): { readonly invite: HomeInviteSummary | null; readonly ambiguous: boolean } {
  if (pending.length === 0) return { invite: null, ambiguous: false };
  if (pending.length === 1) return { invite: pending[0] ?? null, ambiguous: false };

  const needle = hint?.trim().toLowerCase() ?? "";
  if (needle.length > 0) {
    const matched = pending.filter((entry) => {
      const name = entry.room?.name?.toLowerCase() ?? "";
      const code = entry.room?.code?.toLowerCase() ?? "";
      return name.includes(needle) || code === needle;
    });
    if (matched.length === 1) return { invite: matched[0] ?? null, ambiguous: false };
  }
  return { invite: null, ambiguous: true };
}

/** The rooms a pending-invite question can name back to the person. */
export function inviteRoomNames(pending: readonly HomeInviteSummary[]): string {
  return pending
    .map((entry) => entry.room?.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0)
    .join(", ");
}

/** True when this person is already a friend, so Po need not ask again. */
export async function isAlreadyFriend(
  profileId: string,
  candidateProfileId: string,
): Promise<boolean> {
  const overview = await loadPoSocial(profileId);
  return (overview?.friends ?? []).some((friend) => friend.profileId === candidateProfileId);
}

/**
 * The only service the room could sensibly be set to. With exactly one
 * selectable option, "pick a service" has a single answer already.
 */
export async function soleSelectableProvider(
  profileId: string,
): Promise<{ readonly id: string; readonly key: string } | null> {
  const catalog = await loadPoProviders(profileId);
  if (!catalog) return null;
  const selectable = catalog.options.filter(
    (option) => option.isSelectable && option.complianceAction !== "block",
  );
  const only = selectable.length === 1 ? selectable[0] : undefined;
  return only ? { id: only.provider.id, key: only.provider.key } : null;
}

/** Invitations waiting on this person right now. */
export async function pendingInvites(profileId: string): Promise<readonly HomeInviteSummary[]> {
  const home = await loadPoHome(profileId);
  return home?.pendingInvites ?? [];
}
