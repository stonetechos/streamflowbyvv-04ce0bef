/**
 * Shared elapsed timer — Milestone G.
 *
 * The room's headline number. It is deliberately not called "position": it is
 * how long everyone has been watching together, which is a fact StreamFlow can
 * honestly know, unlike the player's own timeline.
 */
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { ElapsedTime } from "../use-elapsed-time";

export interface SharedElapsedTimerProps {
  readonly elapsed: ElapsedTime;
  readonly className?: string;
}

export function SharedElapsedTimer({ elapsed, className }: SharedElapsedTimerProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("text-center", className)}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {t("watch_party.elapsed.label")}
      </p>
      <p
        className="mt-1 font-mono text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl"
        aria-live="off"
      >
        {elapsed.label}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t("watch_party.elapsed.hint")}</p>
    </div>
  );
}
