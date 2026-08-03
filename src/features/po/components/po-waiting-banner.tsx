/**
 * Po waiting banner — Sprint 2.1, extended in Sprint 2.2.
 *
 * A lightweight strip that keeps the lobby warm while people gather. Po is a
 * visual companion in this sprint and nothing else: no planning, no tools, no
 * memory, no conversation (Po Rule). The banner therefore takes no service,
 * emits no event, and never blocks input — it is `aria-hidden` decoration with
 * a short polite caption beside it.
 *
 * Sprint 2.2 adds two more lobby signals (a host action in flight, a provider
 * chosen). They only pick an idle animation and a caption; Po still reacts to
 * nothing it was not handed.
 */
import { PoCompanion, type PoMood } from "./po-companion";

import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface PoWaitingBannerProps {
  /** Po smiles once everyone in the room has signalled ready. */
  readonly allReady?: boolean;
  /** A host decision is being saved. */
  readonly isBusy?: boolean;
  /** The room now has a provider chosen. */
  readonly hasProvider?: boolean;
  /** A countdown is running. */
  readonly isCounting?: boolean;
  /** The countdown reached zero. */
  readonly hasCompleted?: boolean;
  /** The countdown was cancelled or expired — a brief disappointed beat. */
  readonly wasCancelled?: boolean;
  /** The room is ready to watch — Po stands up (Sprint 2.4, visual only). */
  readonly isPlaybackReady?: boolean;
  /** Clocks are still settling — Po watches quietly (Sprint 2.5). */
  readonly isSyncing?: boolean;
  /** Everyone reached Excellent or Good — Po gives a satisfied smile. */
  readonly isSyncSatisfied?: boolean;
  /** The room needs a re-sync — Po calmly gestures that someone is catching up. */
  readonly isRoomOutOfSync?: boolean;
  /** The room just returned to a healthy band — Po visibly relaxes. */
  readonly hasRoomRecovered?: boolean;
  /** A playback re-sync is recommended or required — Po encourages patience. */
  readonly needsSyncEncouragement?: boolean;
  /** Everyone became synchronization ready — Po celebrates, quietly. */
  readonly isSynchronizationReady?: boolean;
  /** Changing this makes Po glance toward the roster (e.g. a new arrival). */
  readonly gazeToken?: string | null;
  readonly className?: string;
}

/** Pure mapping from lobby signals to a mood. Order is the priority order. */
export function resolvePoWaitingMood(signals: {
  readonly allReady?: boolean;
  readonly isBusy?: boolean;
  readonly hasProvider?: boolean;
  readonly isCounting?: boolean;
  readonly hasCompleted?: boolean;
  readonly wasCancelled?: boolean;
  readonly isPlaybackReady?: boolean;
  readonly isSyncing?: boolean;
  readonly isSyncSatisfied?: boolean;
  readonly isRoomOutOfSync?: boolean;
  readonly hasRoomRecovered?: boolean;
  readonly needsSyncEncouragement?: boolean;
  readonly isSynchronizationReady?: boolean;
}): PoMood {
  // Sprint 2.6 — the room being out of step outranks every happier signal:
  // it is the one thing standing between the lobby and a countdown.
  if (signals.isRoomOutOfSync) return "concerned";
  if (signals.hasRoomRecovered) return "relieved";
  // Sprint 2.7 — playback synchronization sits just under the room's clock
  // verdict: encourage patience while a re-sync is pending, celebrate the
  // moment everyone is together. Both decorative (Po Rule).
  if (signals.needsSyncEncouragement) return "encouraging";
  if (signals.isSynchronizationReady) return "celebrating";
  // Readiness is the happiest thing the lobby can report, so it outranks the
  // countdown beats it necessarily follows.
  if (signals.isPlaybackReady) return "excited";
  // Countdown outranks every lobby signal: it is the thing everyone is
  // watching. Cancellation wins over "counting" so the disappointed beat is
  // never swallowed by a stale tick.
  if (signals.wasCancelled) return "disappointed";
  if (signals.hasCompleted) return "celebrating";
  if (signals.isCounting) return "counting";
  if (signals.isBusy) return "thinking";
  if (signals.allReady) return "delighted";
  // Sprint 2.5 — clocks. Po watches while they settle, and gives the same
  // satisfied smile as "everyone ready" once they land in a healthy band.
  if (signals.isSyncing) return "observing";
  if (signals.isSyncSatisfied) return "delighted";
  if (signals.hasProvider) return "focused";
  return "calm";
}

const CAPTION_KEYS: Readonly<Record<PoMood, string>> = {
  calm: "po.banner.waiting",
  thinking: "po.banner.thinking",
  delighted: "po.banner.all_ready",
  focused: "po.banner.provider_selected",
  counting: "po.banner.counting",
  celebrating: "po.banner.celebrating",
  disappointed: "po.banner.cancelled",
  excited: "po.banner.playback_ready",
  observing: "po.banner.observing",
  concerned: "po.banner.concerned",
  encouraging: "po.banner.encouraging",
  relieved: "po.banner.relieved",
};

export function PoWaitingBanner({
  allReady = false,
  isBusy = false,
  hasProvider = false,
  isCounting = false,
  hasCompleted = false,
  wasCancelled = false,
  isPlaybackReady = false,
  isSyncing = false,
  isSyncSatisfied = false,
  isRoomOutOfSync = false,
  hasRoomRecovered = false,
  needsSyncEncouragement = false,
  isSynchronizationReady = false,
  gazeToken = null,
  className,
}: PoWaitingBannerProps) {
  const { t } = useTranslation();
  const mood = resolvePoWaitingMood({
    allReady,
    isBusy,
    hasProvider,
    isCounting,
    hasCompleted,
    wasCancelled,
    isPlaybackReady,
    isSyncing,
    isSyncSatisfied,
    isRoomOutOfSync,
    hasRoomRecovered,
    needsSyncEncouragement,
    isSynchronizationReady,
  });

  return (
    <aside
      className={cn(
        "flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-surface px-4 py-3",
        className,
      )}
    >
      <PoCompanion mood={mood} gazeToken={gazeToken} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{t("po.banner.title")}</p>
        <p className="text-xs text-muted-foreground">{t(CAPTION_KEYS[mood])}</p>
      </div>
    </aside>
  );
}
