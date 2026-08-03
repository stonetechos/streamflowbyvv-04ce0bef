/**
 * Manual play reminder — Sprint 2.9.
 *
 * The honest last step of the workflow. StreamFlow coordinates the moment; the
 * play button belongs to the member, in their own app, on their own account.
 * Whether the reminder is due is decided by `ReadyCoordinator`.
 */
import { useTranslation } from "@/foundation/localization";

export interface ManualPlayReminderProps {
  readonly isDue: boolean;
  /** True once the countdown has reached zero — the wording sharpens. */
  readonly hasCountdownFinished: boolean;
}

export function ManualPlayReminder({ isDue, hasCountdownFinished }: ManualPlayReminderProps) {
  const { t } = useTranslation();
  if (!isDue) return null;

  return (
    <p
      className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground"
      role="note"
    >
      {t(hasCountdownFinished ? "room.manual_play.now" : "room.manual_play.before")}
    </p>
  );
}
