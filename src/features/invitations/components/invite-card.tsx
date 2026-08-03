/**
 * Invitation card — Milestone E.
 *
 * One pending invitation, with the two answers a person can give. Whether an
 * invite is still answerable was decided upstream (ADR-006); this card only
 * presents it and reports the answer.
 */
import { ActionButton, Avatar, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import type { HomeInviteSummary } from "@/domain";

export interface InviteCardProps {
  readonly summary: HomeInviteSummary;
  readonly busy?: boolean;
  onAccept(inviteId: string): void;
  onDecline(inviteId: string): void;
}

export function InviteCard({ summary, busy = false, onAccept, onDecline }: InviteCardProps) {
  const { t } = useTranslation();
  const { invite, room } = summary;
  const title = room?.name ?? t("invite.unknown_room");

  return (
    <Surface padding="sm" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Avatar name={title} size="md" />
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(`invite.channel.${invite.channel}`)}
            {invite.expiresAt ? ` · ${t("invite.expires")}` : ""}
          </p>
          <p className="mt-1 font-mono text-[0.6875rem] text-muted-foreground">{invite.code}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <ActionButton
          size="sm"
          loading={busy}
          onClick={() => onAccept(invite.id)}
          className="flex-1"
        >
          {t("invite.action.accept")}
        </ActionButton>
        <ActionButton
          size="sm"
          tone="ghost"
          disabled={busy}
          onClick={() => onDecline(invite.id)}
          className="flex-1"
        >
          {t("invite.action.decline")}
        </ActionButton>
      </div>
    </Surface>
  );
}
