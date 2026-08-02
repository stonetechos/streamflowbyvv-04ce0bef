/**
 * Membership actions — Sprint 2.0.
 *
 * Join, leave, and the readiness signal. Every control names the service call
 * behind it and disables only itself while that call is in flight.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/foundation/localization";

import type { ViewerView, WaitingRoomPendingAction } from "../waiting-room.types";

export interface MembershipActionsProps {
  readonly viewer: ViewerView;
  readonly pending: WaitingRoomPendingAction;
  readonly canJoin: boolean;
  onJoin(): void;
  onLeave(): void;
  onReadyChange(ready: boolean): void;
}

export function MembershipActions({
  viewer,
  pending,
  canJoin,
  onJoin,
  onLeave,
  onReadyChange,
}: MembershipActionsProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("room.actions.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {viewer.isMember ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="waiting-room-ready" className="text-sm font-medium">
                {t("room.actions.ready_label")}
              </label>
              <Switch
                id="waiting-room-ready"
                checked={viewer.isReady}
                disabled={pending === "readiness"}
                onCheckedChange={onReadyChange}
                aria-describedby="waiting-room-ready-hint"
              />
            </div>
            <p id="waiting-room-ready-hint" className="text-xs text-muted-foreground">
              {t("room.actions.ready_hint")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending === "leave"}
              onClick={onLeave}
            >
              {t("room.actions.leave")}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t("room.actions.join_hint")}</p>
            <Button
              type="button"
              className="w-full"
              disabled={!canJoin || pending === "join"}
              onClick={onJoin}
            >
              {t("room.actions.join")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
