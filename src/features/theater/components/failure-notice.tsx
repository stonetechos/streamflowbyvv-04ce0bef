/**
 * Failure notice — Sprint H7.
 *
 * Every failure answers the same four questions: what happened, is the party
 * still on, what to do next, and whether trying again is safe. The wording
 * comes from the localization bundle; raw errors never reach this component.
 */
import { ActionButton, Surface } from "@/design-system/components";
import { describeFailure, type FailureKind } from "@/domain";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface FailureNoticeProps {
  readonly kind: FailureKind;
  readonly onRetry?: (() => void) | null;
  readonly retryLabel?: string;
  readonly onDismiss?: (() => void) | null;
}

export function FailureNotice({ kind, onRetry, retryLabel, onDismiss }: FailureNoticeProps) {
  const { t } = useTranslation();
  const guidance = describeFailure(kind);

  return (
    <Surface
      tone="card"
      padding="md"
      role="status"
      aria-live="polite"
      data-sf-failure={kind}
      className={cn(
        "flex flex-col gap-2 border-l-4",
        guidance.tone === "warning" ? "border-l-destructive" : "border-l-primary",
      )}
    >
      <p className="text-sm font-medium">{t(guidance.whatKey)}</p>
      <p className="text-sm text-muted-foreground">{t(guidance.nextKey)}</p>
      <p className="text-xs text-muted-foreground">
        {t(guidance.roomStillActive ? "room.failure.still_active" : "room.failure.ended")}
        {guidance.retrySafe ? ` · ${t("room.failure.retry_safe")}` : ""}
      </p>
      {onRetry || onDismiss ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {onRetry ? (
            <ActionButton tone="secondary" size="sm" className="min-h-11" onClick={onRetry}>
              {retryLabel ?? t("common.action.retry")}
            </ActionButton>
          ) : null}
          {onDismiss ? (
            <ActionButton tone="ghost" size="sm" className="min-h-11" onClick={onDismiss}>
              {t("common.action.dismiss")}
            </ActionButton>
          ) : null}
        </div>
      ) : null}
    </Surface>
  );
}
