/**
 * Sync badge — Sprint H1.
 *
 * Reports measured drift only. When nothing has been measured it says so
 * rather than implying a synchronization it cannot evidence.
 */
import { useTranslation } from "@/foundation/localization";
import type { SyncStatusLabel } from "@/domain";

export interface SyncBadgeProps {
  readonly verdict: SyncStatusLabel;
  readonly driftMs: number | null;
  readonly isLive: boolean;
}

const TONE: Record<SyncStatusLabel, string> = {
  synced: "bg-success/15 text-success border-success/30",
  "catching-up": "bg-warning/15 text-warning border-warning/30",
  recovering: "bg-destructive/15 text-destructive border-destructive/30",
  // Manual coordination is not a degraded sync; it is a different mode.
  manual: "bg-primary/10 text-primary border-primary/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

const KEY: Record<SyncStatusLabel, string> = {
  synced: "theater.sync.synced",
  "catching-up": "theater.sync.catching_up",
  recovering: "theater.sync.recovering",
  manual: "theater.sync.manual",
  unknown: "theater.sync.unknown",
};

export function SyncBadge({ verdict, driftMs, isLive }: SyncBadgeProps) {
  const { t } = useTranslation();
  const label = t(KEY[verdict]);
  const drift =
    driftMs === null ? null : `${driftMs > 0 ? "+" : ""}${(driftMs / 1000).toFixed(1)}s`;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${TONE[verdict]}`}
      data-sf-sync-verdict={verdict}
      data-sf-sync-drift-ms={driftMs ?? ""}
      data-sf-sync-live={isLive ? "true" : "false"}
    >
      {label}
      {drift ? <span className="tabular-nums opacity-80">{drift}</span> : null}
    </span>
  );
}
