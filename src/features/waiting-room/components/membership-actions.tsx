/**
 * Membership actions — Sprint 2.0.
 *
 * Join and leave. Since Sprint 2.9 readiness is confirmed explicitly in
 * `ReadyConfirmationCard`, so this card owns membership only. Every control
 * names the service call behind it and disables only itself while in flight.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/foundation/localization";

import type { ViewerView, WaitingRoomPendingAction } from "../waiting-room.types";

export interface MembershipActionsProps {
  readonly viewer: ViewerView;
  readonly pending: WaitingRoomPendingAction;
  readonly canJoin: boolean;
  onJoin(): void;
  onLeave(): void;
}

export function MembershipActions({
  viewer,
  pending,
  canJoin,
  onJoin,
  onLeave,
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
            <p className="text-sm text-muted-foreground">{t("room.actions.member_hint")}</p>
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
