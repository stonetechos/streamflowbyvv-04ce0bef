/**
 * Room information card — Sprint 2.0.
 *
 * Identity of the room: name, human-readable code, lifecycle status, capacity,
 * and whether live updates are attached. No playback, no provider, no
 * countdown — those belong to later sprints (Build Rules §1).
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/foundation/localization";

import type { RoomSummaryView } from "../waiting-room.types";

export interface RoomInfoCardProps {
  readonly room: RoomSummaryView;
  readonly isLive: boolean;
}

export function RoomInfoCard({ room, isLive }: RoomInfoCardProps) {
  const { t, formatDate } = useTranslation();

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl">{room.name}</CardTitle>
          <Badge variant={room.status === "lobby" ? "secondary" : "outline"}>
            {t(`room.status.${room.status}`)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("room.waiting_room.subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("room.info.code")}
            </dt>
            <dd className="mt-1 font-mono text-base">{room.code}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("room.info.occupancy")}
            </dt>
            <dd className="mt-1 text-base">
              {t("room.info.occupancy_value", {
                joined: room.joinedCount,
                capacity: room.capacity,
              })}
            </dd>
          </div>
          {room.scheduledStartAt ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("room.info.scheduled_start")}
              </dt>
              <dd className="mt-1 text-base">{formatDate(new Date(room.scheduledStartAt))}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("room.info.updates")}
            </dt>
            <dd className="mt-1 text-base">
              {t(isLive ? "room.info.updates_live" : "room.info.updates_manual")}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
