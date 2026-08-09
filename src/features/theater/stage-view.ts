/**
 * Stage view model — theatre stage rework.
 *
 * Pure derivation of what the room's centre panel shows. It exists as its own
 * module so the honesty rules (never fake embedded playback, never offer a
 * host-only action to a guest, never print the same empty state twice) can be
 * tested without a browser.
 */
import type { RoomPhase, WatchProviderCapability, WatchSource } from "@/domain";

export type StageKind = "empty" | "preparing" | "handoff" | "embedded";

export interface StageViewInput {
  readonly source: WatchSource | null;
  readonly capability: WatchProviderCapability;
  readonly isHost: boolean;
  readonly phase: RoomPhase;
  /** A choice is being written or opened: the stage waits, it never blanks. */
  readonly isPreparing?: boolean;
  /** This person has already opened the service in their own browser. */
  readonly hasLaunched?: boolean;
}

export interface StageView {
  readonly kind: StageKind;
  readonly role: "host" | "guest";
  /** True only for a host with nothing chosen: the one actionable empty state. */
  readonly showsChooseCta: boolean;
  /** True only for a guest with nothing chosen. */
  readonly showsWaitingLine: boolean;
  /** False while nothing is chosen, so the empty state is never duplicated. */
  readonly showsMediaCard: boolean;
  /** Translation key describing where the room is, once something is chosen. */
  readonly statusKey: string;
}

const STATUS_KEYS: Readonly<Record<RoomPhase, string>> = {
  "waiting-for-content": "theater.stage.status.waiting",
  "content-selected": "theater.stage.status.selected",
  countdown: "theater.stage.status.countdown",
  watching: "theater.stage.status.watching",
  paused: "theater.stage.status.paused",
  ended: "theater.stage.status.ended",
  closed: "theater.stage.status.closed",
};

export function deriveStageView({
  source,
  capability,
  isHost,
  phase,
  isPreparing = false,
  hasLaunched = false,
}: StageViewInput): StageView {
  const role = isHost ? ("host" as const) : ("guest" as const);
  const statusKey = STATUS_KEYS[phase] ?? "theater.stage.status.selected";

  // A selection in flight is a real state of the room, not a blank panel.
  if (isPreparing && !source) {
    return {
      kind: "preparing",
      role,
      showsChooseCta: false,
      showsWaitingLine: false,
      showsMediaCard: false,
      statusKey: "theater.stage.status.preparing",
    };
  }

  if (!source) {
    return {
      kind: "empty",
      role,
      showsChooseCta: isHost,
      showsWaitingLine: !isHost,
      showsMediaCard: false,
      statusKey,
    };
  }

  const embedded = source.kind === "direct" && capability.allowsEmbeddedPlayback;

  // Once the service has been opened externally, the room says so plainly
  // rather than pretending it is waiting for something.
  const handoffStatusKey =
    hasLaunched && phase !== "ended" && phase !== "closed"
      ? "theater.stage.status.launched"
      : statusKey;

  return {
    kind: embedded ? "embedded" : "handoff",
    role,
    showsChooseCta: false,
    showsWaitingLine: false,
    showsMediaCard: true,
    statusKey: embedded ? statusKey : handoffStatusKey,
  };
}
