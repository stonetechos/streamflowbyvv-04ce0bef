/**
 * Monetization research panel — Sprint H8.
 *
 * Two optional questions about ideas that do not exist yet. Nothing here
 * charges, reserves, unlocks, or restricts anything, and every capability the
 * MVP promises stays free regardless of any answer given here.
 *
 * The panel is shown only to beta cohort members, and only after a session has
 * ended — never inside a live room.
 */
import { useState } from "react";

import { ActionButton, Surface } from "@/design-system/components";
import {
  PAY_ANSWERS,
  PREMIUM_CONCEPTS,
  VALUE_ANSWERS,
  isBillingActive,
  type PayAnswer,
  type PremiumConcept,
  type ValueAnswer,
} from "@/domain";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface ResearchPanelProps {
  readonly concepts?: readonly PremiumConcept[];
  readonly onRespond: (input: {
    concept: PremiumConcept;
    value: ValueAnswer | null;
    pay: PayAnswer | null;
  }) => void;
  readonly onDismiss: () => void;
}

const SHOWN_CONCEPTS = 3;

export function ResearchPanel({ concepts, onRespond, onDismiss }: ResearchPanelProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState<ValueAnswer | null>(null);
  const [pay, setPay] = useState<PayAnswer | null>(null);
  const [done, setDone] = useState(false);

  const list = (concepts ?? PREMIUM_CONCEPTS).slice(0, SHOWN_CONCEPTS);
  const concept = list[index];

  // A research surface that could bill would be a different thing entirely.
  if (isBillingActive() || concept === undefined) return null;

  if (done) {
    return (
      <Surface tone="card" padding="md" data-sf-research="done">
        <p aria-live="polite" className="text-sm">
          {t("research.thanks")}
        </p>
      </Surface>
    );
  }

  function submit() {
    if (concept === undefined) return;
    onRespond({ concept, value, pay });
    setValue(null);
    setPay(null);
    if (index + 1 >= list.length) setDone(true);
    else setIndex(index + 1);
  }

  return (
    <Surface tone="card" padding="md" className="flex flex-col gap-4" data-sf-research={concept}>
      <div>
        <h2 className="text-sm font-semibold">{t("research.title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("research.disclaimer")}</p>
      </div>

      <div>
        <p className="text-sm font-medium">{t(`research.concept.${concept}`)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(`research.concept.${concept}.description`)}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">{t("research.question.value")}</legend>
        <div className="flex flex-wrap gap-2">
          {VALUE_ANSWERS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              onClick={() => setValue(value === option ? null : option)}
              className={cn(
                "min-h-11 rounded-xl border px-3 text-sm transition-colors",
                value === option ? "border-primary bg-accent" : "border-border hover:bg-accent/60",
              )}
            >
              {t(`research.value.${option}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">{t("research.question.pay")}</legend>
        <div className="flex flex-wrap gap-2">
          {PAY_ANSWERS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={pay === option}
              onClick={() => setPay(pay === option ? null : option)}
              className={cn(
                "min-h-11 rounded-xl border px-3 text-sm transition-colors",
                pay === option ? "border-primary bg-accent" : "border-border hover:bg-accent/60",
              )}
            >
              {t(`research.pay.${option}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={submit}>{t("research.action.next")}</ActionButton>
        <ActionButton tone="ghost" onClick={onDismiss}>
          {t("research.action.skip")}
        </ActionButton>
      </div>
    </Surface>
  );
}
