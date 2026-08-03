/**
 * Watch party status — Milestone G.
 *
 * Playback and synchronization standing, side by side, in words the room can
 * act on. Both verdicts come from Domain; this component picks the copy and
 * offers the one action a member can actually take — re-measure their clock.
 */
import { ActionButton, Surface } from "@/design-system/components";
import type { SyncHealth } from "@/domain";
import {
  PLAYBACK_SYNC_DECISION_KEYS,
  SYNC_HEALTH_KEYS,
  type PlaybackSyncModel,
} from "@/features/waiting-room";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface WatchPartyStatusProps {
  readonly sync: PlaybackSyncModel;
  readonly health: SyncHealth;
  readonly isMeasuring: boolean;
  readonly onResync: () => void;
  readonly className?: string;
}

const HEALTH_TONE: Readonly<Record<string, string>> = {
  excellent: "text-success",
  good: "text-success",
  warning: "text-warning",
  resync_required: "text-destructive",
};

export function WatchPartyStatus({
  sync,
  health,
  isMeasuring,
  onResync,
  className,
}: WatchPartyStatusProps) {
  const { t } = useTranslation();

  return (
    <Surface padding="lg" className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold">{t("watch_party.status.title")}</h2>
          <p className={cn("mt-1 text-sm", HEALTH_TONE[health] ?? "text-muted-foreground")}>
            {t(SYNC_HEALTH_KEYS[health])}
          </p>
        </div>
        <ActionButton
          tone="secondary"
          onClick={onResync}
          loading={isMeasuring}
          aria-label={t("watch_party.status.resync")}
        >
          {t("watch_party.status.resync")}
        </ActionButton>
      </div>

      <p className="text-sm text-muted-foreground" role="status">
        {t(PLAYBACK_SYNC_DECISION_KEYS[sync.decision])}
      </p>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label={t("watch_party.status.in_sync")} value={sync.inSyncCount} tone="success" />
        <Stat
          label={t("watch_party.status.out_of_sync")}
          value={sync.outOfSyncCount}
          tone={sync.outOfSyncCount > 0 ? "warning" : "muted"}
        />
        <Stat label={t("watch_party.status.unmeasured")} value={sync.unmeasuredCount} tone="muted" />
      </dl>
    </Surface>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "muted";
}) {
  return (
    <div className="rounded-xl bg-muted/40 px-2 py-3">
      <dt className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular-nums",
          tone === "success"
            ? "text-success"
            : tone === "warning"
              ? "text-warning"
              : "text-muted-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
