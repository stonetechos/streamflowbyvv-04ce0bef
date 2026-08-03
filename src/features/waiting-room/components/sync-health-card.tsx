/**
 * Synchronization health card — Sprint 2.5.
 *
 * Shows the room one word: Excellent, Good, Warning, or Re-sync Required. The
 * numbers behind it (offset, latency, confidence) are supporting detail, and
 * are shown as plain measurements rather than as promises.
 *
 * There is no correction control here, and there is deliberately no effect on
 * the countdown: this sprint classifies, it does not adjust. The one action
 * offered is "measure again", which is a measurement, not a fix.
 *
 * Pure presentation — spoken updates come from the hook's announcer, so this
 * card has no live region of its own.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SyncHealth } from "@/domain";
import { useTranslation } from "@/foundation/localization";

import { SYNC_HEALTH_KEYS, type RoomClockSyncModel } from "../use-room-clock-sync";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const HEALTH_VARIANTS: Readonly<Record<SyncHealth, BadgeVariant>> = Object.freeze({
  excellent: "default",
  good: "secondary",
  warning: "outline",
  resync_required: "destructive",
  unknown: "outline",
});

export interface SyncHealthCardProps {
  readonly sync: RoomClockSyncModel;
}

export function SyncHealthCard({ sync }: SyncHealthCardProps) {
  const { t } = useTranslation();
  const offset = sync.snapshot?.offset ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t("room.sync.title")}</CardTitle>
            <CardDescription>{t("room.sync.description")}</CardDescription>
          </div>
          <Badge variant={HEALTH_VARIANTS[sync.health]}>{t(SYNC_HEALTH_KEYS[sync.health])}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {offset ? (
          <dl className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">{t("room.sync.metric.offset")}</dt>
              <dd className="font-medium tabular-nums">
                {t("room.sync.metric.milliseconds", { value: String(offset.offsetMs) })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("room.sync.metric.latency")}</dt>
              <dd className="font-medium tabular-nums">
                {t("room.sync.metric.milliseconds", { value: String(offset.latencyMs) })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("room.sync.metric.confidence")}</dt>
              <dd className="font-medium tabular-nums">
                {t("room.sync.metric.percent", {
                  value: String(Math.round(offset.confidence * 100)),
                })}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">
            {sync.isAvailable ? t("room.sync.measuring") : t("room.sync.unavailable")}
          </p>
        )}

        {sync.needsResync ? (
          <p className="text-xs text-muted-foreground">{t("room.sync.resync_hint")}</p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{t("room.sync.no_correction_notice")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={sync.remeasure}
            disabled={!sync.isAvailable || sync.isMeasuring}
          >
            {sync.isMeasuring ? t("room.sync.measuring_action") : t("room.sync.measure_action")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
