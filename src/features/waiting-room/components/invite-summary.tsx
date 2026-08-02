/**
 * Invite summary — Sprint 2.0.
 *
 * A count and an explanation, nothing more: creating, revoking, and sharing
 * invites are separate journeys owned by a later sprint (MVP §7).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/foundation/localization";

export interface InviteSummaryProps {
  readonly pendingInviteCount: number;
  readonly roomCode: string;
}

export function InviteSummary({ pendingInviteCount, roomCode }: InviteSummaryProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("invite.summary.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold tabular-nums">{pendingInviteCount}</p>
        <p className="text-sm text-muted-foreground">
          {pendingInviteCount === 0
            ? t("invite.summary.empty")
            : t("invite.summary.pending", { count: pendingInviteCount })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("invite.summary.share_hint", { code: roomCode })}
        </p>
      </CardContent>
    </Card>
  );
}
