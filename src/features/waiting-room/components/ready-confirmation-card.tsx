/**
 * Ready confirmation — Sprint 2.9.
 *
 * Where a member says, explicitly, that they are ready. The card renders a
 * Domain verdict and nothing else: it counts nobody, compares nothing, and
 * never infers that the room can start (`ReadyCoordinator` decides all of it).
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { RoomReadyModel } from "../use-room-ready";

const VIEWER_STATE_KEYS: Readonly<Record<string, string>> = {
  not_member: "room.ready.state.not_member",
  not_ready: "room.ready.state.not_ready",
  launch_pending: "room.ready.state.launch_pending",
  waiting_for_others: "room.ready.state.waiting_for_others",
  everyone_ready: "room.ready.state.everyone_ready",
};

export interface ReadyConfirmationCardProps {
  readonly ready: RoomReadyModel;
}

export function ReadyConfirmationCard({ ready }: ReadyConfirmationCardProps) {
  const { t } = useTranslation();
  const snapshot = ready.snapshot;

  if (!ready.isAvailable || !snapshot || snapshot.viewerState === "not_member") return null;

  const isReady = snapshot.viewerIsReady;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("room.ready.title")}</CardTitle>
        <CardDescription>{t("room.ready.description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <p
          className={cn(
            "text-sm font-medium",
            snapshot.everyoneReady
              ? "text-primary"
              : isReady
                ? "text-foreground"
                : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {t(VIEWER_STATE_KEYS[snapshot.viewerState] ?? "room.ready.state.not_ready")}
        </p>

        <p className="text-xs text-muted-foreground">
          {t("room.ready.count", {
            ready: String(snapshot.readyCount),
            total: String(snapshot.participantCount),
          })}
        </p>

        {snapshot.viewerTimedOut ? (
          <p className="text-xs text-destructive">{t("room.ready.timeout_hint")}</p>
        ) : null}

        {snapshot.lateJoinerProfileIds.length > 0 ? (
          <p className="text-xs text-muted-foreground">{t("room.ready.late_join_hint")}</p>
        ) : null}

        {isReady ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={ready.isConfirming}
            onClick={ready.withdraw}
          >
            {t("room.ready.action.undo")}
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full"
            disabled={ready.isConfirming}
            onClick={ready.confirm}
          >
            {t("room.ready.action.confirm")}
          </Button>
        )}

        <p className="text-xs text-muted-foreground">{t("room.ready.no_control_notice")}</p>
      </CardContent>
    </Card>
  );
}
