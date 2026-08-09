/**
 * Room activity classification — product correction pass.
 *
 * "Continue watching" must mean a room somebody can walk back into, not a
 * lobby that was opened once and abandoned. Dormancy is a room fact, so it is
 * decided here and read everywhere, instead of each surface inventing its own
 * freshness rule.
 */
import type { RoomStatus } from "@/domain/shared/domain-enums";

/** A lobby nobody touched for this long, alone and empty-handed, is dormant. */
export const DORMANT_AFTER_MS = 30 * 60 * 1000;

/** A room that never chose anything goes dormant sooner. */
export const DORMANT_EMPTY_AFTER_MS = 10 * 60 * 1000;

export type RoomActivity = "live" | "dormant" | "closed";

export interface RoomActivityInput {
  readonly status: RoomStatus;
  /** True when the room carries a usable shared selection. */
  readonly hasMedia: boolean;
  /** Seats currently taken (invited or joined). */
  readonly memberCount: number;
  /** ISO-8601 of the room's last change. */
  readonly updatedAt: string;
  readonly now: number;
}

/**
 * `closed` is terminal. `dormant` is a live row that has gone quiet: nobody
 * else is in it, nothing was chosen or nothing has happened for a long time.
 * Everything else is `live`.
 */
export function classifyRoomActivity({
  status,
  hasMedia,
  memberCount,
  updatedAt,
  now,
}: RoomActivityInput): RoomActivity {
  if (status === "ended" || status === "abandoned") return "closed";

  const idleMs = now - (Date.parse(updatedAt) || now);
  const isSolo = memberCount <= 1;

  // A room with company, or one already watching, is never called dormant.
  if (status === "active" || status === "paused") return "live";
  if (!isSolo) return "live";

  const threshold = hasMedia ? DORMANT_AFTER_MS : DORMANT_EMPTY_AFTER_MS;
  return idleMs >= threshold ? "dormant" : "live";
}

/** Only a live room may be offered as "continue watching". */
export function isResumableActivity(activity: RoomActivity): boolean {
  return activity === "live";
}
