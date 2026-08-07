/**
 * Beta feedback — Sprint H7.
 *
 * Two questions, shown only once the party is over for this person. Everything
 * is optional, dismissing is a first-class answer, and nothing is sent
 * anywhere: the entry stays in this tab's session store for the team's own
 * dashboard.
 */
import { useState } from "react";

import { ActionButton, Surface } from "@/design-system/components";
import { FEEDBACK_CATEGORIES, FEEDBACK_COMMENT_MAX, FEEDBACK_OUTCOMES } from "@/domain";
import type { FeedbackCategory, FeedbackOutcome } from "@/domain";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface BetaFeedbackProps {
  readonly onSubmit: (input: {
    outcome: FeedbackOutcome;
    categories: readonly FeedbackCategory[];
    comment: string | null;
  }) => void;
  readonly onDismiss: () => void;
}

export function BetaFeedback({ onSubmit, onDismiss }: BetaFeedbackProps) {
  const { t } = useTranslation();
  const [outcome, setOutcome] = useState<FeedbackOutcome | null>(null);
  const [categories, setCategories] = useState<readonly FeedbackCategory[]>([]);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  function toggle(category: FeedbackCategory) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  if (sent) {
    return (
      <Surface tone="card" padding="md" data-sf-feedback="sent">
        <p aria-live="polite" className="text-sm">
          {t("room.feedback.thanks")}
        </p>
      </Surface>
    );
  }

  return (
    <Surface tone="card" padding="md" className="flex flex-col gap-4" data-sf-feedback="prompt">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t("room.feedback.title")}</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_OUTCOMES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={outcome === option}
              onClick={() => setOutcome(option)}
              className={cn(
                "min-h-11 rounded-xl border px-4 text-sm transition-colors",
                outcome === option
                  ? "border-primary bg-accent font-medium"
                  : "border-border hover:bg-accent/60",
              )}
            >
              {t(`room.feedback.outcome.${option}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {outcome && outcome !== "yes" ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{t("room.feedback.detail")}</legend>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={categories.includes(category)}
                onClick={() => toggle(category)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 text-xs transition-colors",
                  categories.includes(category)
                    ? "border-primary bg-accent font-medium"
                    : "border-border hover:bg-accent/60",
                )}
              >
                {t(`room.feedback.category.${category}`)}
              </button>
            ))}
          </div>
          <label className="mt-2 flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">{t("room.feedback.comment")}</span>
            <textarea
              value={comment}
              maxLength={FEEDBACK_COMMENT_MAX}
              rows={3}
              onChange={(event) => setComment(event.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <ActionButton
          className="min-h-11"
          onClick={() => {
            if (!outcome) return;
            onSubmit({ outcome, categories, comment: comment.trim() || null });
            setSent(true);
          }}
          disabled={outcome === null}
        >
          {t("room.feedback.submit")}
        </ActionButton>
        <ActionButton tone="ghost" className="min-h-11" onClick={onDismiss}>
          {t("room.feedback.dismiss")}
        </ActionButton>
      </div>
    </Surface>
  );
}
