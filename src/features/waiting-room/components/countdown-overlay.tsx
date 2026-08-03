/**
 * Countdown overlay — UX Simplification Pass.
 *
 * When the room counts down, the room disappears. Three numbers, one line of
 * reassurance, nothing else. Purely presentational: the countdown itself is
 * owned by `useRoomCountdown` and is not influenced by this component.
 */
import { useTranslation } from "@/foundation/localization";

export interface CountdownOverlayProps {
  readonly seconds: number;
  readonly providerName: string | null;
}

export function CountdownOverlay({ seconds, providerName }: CountdownOverlayProps) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-xl"
      role="status"
      aria-live="assertive"
    >
      <span
        key={seconds}
        className="sf-countdown-tick font-display text-[7rem] font-semibold leading-none tabular-nums tracking-tight text-primary sm:text-[10rem]"
      >
        {Math.max(seconds, 0)}
      </span>
      <p className="max-w-xs text-balance text-center text-base text-muted-foreground">
        {providerName
          ? t("room.countdown.launching", { service: providerName })
          : t("room.countdown.launching_generic")}
      </p>
    </div>
  );
}
