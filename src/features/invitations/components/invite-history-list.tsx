/**
 * Invitation history — Milestone E.
 *
 * The invitations a person has already answered, kept visible so a declined
 * invite is not a dead end. Reads nothing new: the answers were recorded by
 * `RoomFlowService`, and this list renders the same summaries the home
 * snapshot carries.
 */
import { EmptyState, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import type { HomeInviteSummary } from "@/domain";

export interface InviteHistoryListProps {
  readonly entries: readonly HomeInviteSummary[];
}

export function InviteHistoryList({ entries }: InviteHistoryListProps) {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return (
      <EmptyState
        title={t("invite.history.empty.title")}
        description={t("invite.history.empty.description")}
      />
    );
  }

  return (
    <Surface padding="none" as="ul" className="divide-y divide-border overflow-hidden">
      {entries.map(({ invite, room }) => (
        <li key={invite.id} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{room?.name ?? t("invite.unknown_room")}</p>
            <p className="mt-0.5 font-mono text-[0.6875rem] text-muted-foreground">{invite.code}</p>
          </div>
          <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[0.6875rem] font-medium text-muted-foreground">
            {t(`invite.status.${invite.status}`)}
          </span>
        </li>
      ))}
    </Surface>
  );
}
