/**
 * Connection banner — Sprint H6.
 *
 * States what the browser actually told us: offline, backgrounded, resyncing,
 * or steady. It never says "reconnected" until a fresh room snapshot has been
 * adopted.
 */
import { useTranslation } from "@/foundation/localization";
import type { RecoveryPhase } from "@/domain";

export interface ConnectionBannerProps {
  readonly phase: RecoveryPhase;
}

export function ConnectionBanner({ phase }: ConnectionBannerProps) {
  const { t } = useTranslation();
  if (phase === "steady") return null;

  const tone =
    phase === "offline"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-border bg-muted text-muted-foreground";

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs ${tone}`}
      role="status"
      aria-live="polite"
      data-sf-recovery-phase={phase}
    >
      {t(`room.recovery.${phase}`)}
    </div>
  );
}
