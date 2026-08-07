/**
 * Activation panel — Sprint H7.
 *
 * One primary action, one short progress trail. The panel renders whatever
 * `deriveActivationPlan` decided; it never adds a second equally weighted call
 * to action and never shows an internal phase name.
 */
import { ActionButton, Surface } from "@/design-system/components";
import type { ActivationAction, ActivationPlan } from "@/domain";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface ActivationPanelProps {
  readonly plan: ActivationPlan;
  readonly onAct: (action: ActivationAction) => void;
  readonly busy?: boolean;
}

/** Actions the viewer can actually press; the rest are statements of waiting. */
const ACTIONABLE: ReadonlySet<ActivationAction> = new Set<ActivationAction>([
  "create_room",
  "invite_someone",
  "choose_content",
  "start_countdown",
  "open_provider",
  "join_voice",
  "mark_ready",
]);

export function ActivationPanel({ plan, onAct, busy = false }: ActivationPanelProps) {
  const { t } = useTranslation();
  const currentIndex = plan.steps.findIndex((step) => step.state === "current");
  const current = currentIndex < 0 ? plan.steps.length : currentIndex + 1;
  const isActionable = ACTIONABLE.has(plan.primary);

  return (
    <Surface
      tone="card"
      padding="md"
      className="flex flex-col gap-3"
      data-sf-activation={plan.primary}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("room.activation.title")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("room.activation.progress", { current, total: plan.steps.length })}
        </p>
      </div>

      <ol className="flex flex-wrap gap-x-3 gap-y-1.5">
        {plan.steps.map((step) => (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              step.state === "done"
                ? "text-muted-foreground"
                : step.state === "current"
                  ? "font-medium text-foreground"
                  : "text-muted-foreground/80",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                step.state === "done"
                  ? "bg-primary/60"
                  : step.state === "current"
                    ? "bg-primary"
                    : "bg-muted-foreground/40",
              )}
            />
            {t(`room.activation.step.${step.key}`)}
          </li>
        ))}
      </ol>

      {plan.primary === "none" ? null : isActionable ? (
        <ActionButton
          onClick={() => onAct(plan.primary)}
          loading={busy}
          className="min-h-11 self-start"
          data-sf-activation-cta
        >
          {t(`room.activation.action.${plan.primary}`)}
        </ActionButton>
      ) : (
        <p className="text-sm text-muted-foreground" data-sf-activation-wait>
          {t(`room.activation.action.${plan.primary}`)}
        </p>
      )}
    </Surface>
  );
}
