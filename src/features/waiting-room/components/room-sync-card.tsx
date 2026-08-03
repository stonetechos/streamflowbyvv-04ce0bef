/**
 * Room synchronization card — Sprint 2.6.
 *
 * The room-level view of synchronization: one overall verdict, then the three
 * counts the lobby cares about — ready, synced, waiting. When the countdown is
 * blocked, the host reads exactly why here rather than guessing from a
 * disabled button.
 *
 * Pure presentation. It classifies nothing: the health verdict comes from
 * `RoomSyncCoordinator` and the readiness counts from `ReadyCoordinator`. Spoken updates come from the hook's announcer, so
 * this card has no live region of its own.
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SyncHealth } from "@/domain";
import { useTranslation } from "@/foundation/localization";

import { SYNC_HEALTH_KEYS } from "../use-room-clock-sync";
import type { RoomSyncModel } from "../use-room-sync";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const HEALTH_VARIANTS: Readonly<Record<SyncHealth, BadgeVariant>> = Object.freeze({
  excellent: "default",
  good: "secondary",
  warning: "outline",
  resync_required: "destructive",
  unknown: "outline",
});

export interface RoomSyncCardProps {
  readonly sync: RoomSyncModel;
  readonly isHost: boolean;
  /** From `ReadyCoordinator`, the sole authority for readiness counts. */
  readonly readyCount: number;
  readonly waitingCount: number;
}

export function RoomSyncCard({ sync, isHost, readyCount, waitingCount }: RoomSyncCardProps) {
  const { t } = useTranslation();

  const counts: readonly { key: string; value: number }[] = [
    { key: "room.room_sync.count.ready", value: readyCount },
    { key: "room.room_sync.count.synced", value: sync.syncedCount },
    { key: "room.room_sync.count.waiting", value: waitingCount },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t("room.room_sync.title")}</CardTitle>
            <CardDescription>{t("room.room_sync.description")}</CardDescription>
          </div>
          <Badge variant={HEALTH_VARIANTS[sync.health]}>{t(SYNC_HEALTH_KEYS[sync.health])}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <dl className="grid grid-cols-3 gap-3 text-xs">
          {counts.map((count) => (
            <div key={count.key}>
              <dt className="text-muted-foreground">{t(count.key)}</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {count.value}
                <span className="text-xs font-normal text-muted-foreground">
                  {t("room.room_sync.count.of", { total: String(sync.participantCount) })}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        {sync.blockReasonKey ? (
          <p className="text-xs text-destructive">
            {t(isHost ? sync.blockReasonKey : "room.room_sync.block.participant_advisory")}
          </p>
        ) : null}

        {sync.hasAdvisory ? (
          <p className="text-xs text-muted-foreground">{t("room.room_sync.advisory.warning")}</p>
        ) : null}

        <p className="text-xs text-muted-foreground">{t("room.room_sync.no_playback_notice")}</p>
      </CardContent>
    </Card>
  );
}
