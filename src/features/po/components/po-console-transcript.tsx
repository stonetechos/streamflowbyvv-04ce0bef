/**
 * Po Console transcript — Milestone H1 §2.
 *
 * The scrolling half of the console: what was said, what Po is waiting on,
 * what a run did, and how it ended. It is a pure renderer — every card here
 * describes state the brain produced, and the only thing it can do is hand a
 * typed answer back up.
 *
 * Auto-scroll follows the newest turn, and is suppressed under reduced motion
 * by jumping instead of gliding.
 */
import { AlertCircle, Check, CircleSlash, HelpCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useAccessibility } from "@/foundation/accessibility";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type {
  PoExecutionPhase,
  PoOutcome,
  PoPendingQuestion,
  PoStepOutcome,
  PoTurn,
} from "../brain/po-brain.types";

export interface PoConsoleTranscriptProps {
  readonly turns: readonly PoTurn[];
  readonly steps: readonly PoStepOutcome[];
  readonly pending: PoPendingQuestion | null;
  readonly outcome: PoOutcome | null;
  readonly isBusy: boolean;
  /** Milestone H1.5 §5 — the phase behind the wait, so it can be named. */
  readonly phase: PoExecutionPhase | null;
  /** Sends a typed answer to an open question, or a yes/no. */
  onAnswer(text: string): void;
}

/** Milestone H1.5 §5 — what to say while each phase is running. */
const PHASE_LABEL: Partial<Record<PoExecutionPhase, string>> = {
  thinking: "po.console.thinking",
  planning: "po.console.planning",
  executing: "po.console.executing",
};

const STEP_ICON: Record<PoStepOutcome["status"], typeof Check> = {
  ok: Check,
  failed: AlertCircle,
  blocked: CircleSlash,
  skipped: CircleSlash,
  cancelled: CircleSlash,
};

export function PoConsoleTranscript({
  turns,
  steps,
  pending,
  outcome,
  isBusy,
  phase,
  onAnswer,
}: PoConsoleTranscriptProps) {
  const { t } = useTranslation();
  const { prefersReducedMotion } = useAccessibility();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [turns, isBusy, prefersReducedMotion]);

  const isFailure = outcome?.status === "failed" || outcome?.status === "refused";
  const ranSomething = steps.length > 0;

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-3"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {turns.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("po.console.empty")}</p>
      ) : (
        <ol className="space-y-3">
          {turns.map((turn, index) => {
            // The closing Po turn of a failed or refused run is the error card:
            // Po says a thing once, so the reason is never repeated below it.
            const isErrorCard =
              turn.role === "po" && isFailure && index === turns.length - 1 && !pending;
            return (
              <li
                key={turn.id}
                className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}
              >
                {turn.role === "user" ? (
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {turn.text}
                  </p>
                ) : isErrorCard ? (
                  <p className="flex max-w-[90%] items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
                    <AlertCircle
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                    />
                    <span>{turn.message ? t(turn.message.key, turn.message.values) : null}</span>
                  </p>
                ) : (
                  <p className="max-w-[90%] text-sm leading-relaxed text-foreground">
                    {turn.message ? t(turn.message.key, turn.message.values) : null}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Execution progress: one line per step the plan actually reached. */}
      {ranSomething ? (
        <ul className="mt-3 space-y-1 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
          {steps.map((step) => {
            const Icon = STEP_ICON[step.status];
            return (
              <li
                key={step.stepId}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    step.status === "ok" ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="truncate">{step.toolName}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Clarification and confirmation cards: the one open question. */}
      {pending ? (
        <div className="mt-3 rounded-lg border border-border/70 bg-secondary/40 px-3 py-2.5">
          <p className="flex items-start gap-2 text-sm">
            <HelpCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{t(pending.message.key, pending.message.values)}</span>
          </p>
          {pending.kind === "confirmation" ? (
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" disabled={isBusy} onClick={() => onAnswer("yes")}>
                {t("po.console.yes")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isBusy}
                onClick={() => onAnswer("no")}
              >
                {t("po.console.no")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Milestone H1.5 §3 — one quiet offer of the next step, never an action. */}
      {!isBusy && !pending && outcome?.followUp ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t(outcome.followUp.key, outcome.followUp.values)}
        </p>
      ) : null}

      {isBusy ? (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          <span className={cn(prefersReducedMotion ? undefined : "animate-pulse")}>
            {t(PHASE_LABEL[phase ?? "thinking"] ?? "po.console.thinking")}
          </span>
        </p>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}
