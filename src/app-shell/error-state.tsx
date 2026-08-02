/**
 * Shared error surface — Sprint 1.0 §2, Foundation §16.
 *
 * Every error the user sees follows one shape: what happened, what they can do,
 * and a reference code they can quote. Copy is localized; the code is not.
 */
import { useEffect } from "react";

import { useAnnouncer } from "@/foundation/accessibility";
import { useTranslation } from "@/foundation/localization";

export interface ErrorStateProps {
  /** Error taxonomy code, e.g. `SF-SYS-UNEXPECTED`. */
  code: string;
  /** Translation key prefix; `.title` resolves the heading. */
  messageKey: string;
  onRetry?: (() => void) | undefined;
  onGoHome?: (() => void) | undefined;
}

export function ErrorState({ code, messageKey, onRetry, onGoHome }: ErrorStateProps) {
  const { t } = useTranslation();
  const announce = useAnnouncer();

  useEffect(() => {
    announce(t("a11y.error.announcement"), "assertive");
  }, [announce, t]);

  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4">
      <div role="alert" className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">{t(`${messageKey}.title`)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t(messageKey)}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("error.action.retry")}
            </button>
          ) : null}
          {onGoHome ? (
            <button
              type="button"
              onClick={onGoHome}
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("error.action.go_home")}
            </button>
          ) : null}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          {t("error.reference.label")}: <code className="font-mono">{code}</code>
        </p>
      </div>
    </div>
  );
}
