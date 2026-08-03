/**
 * Home hero — Milestone H2 (product experience).
 *
 * The question the product exists to answer, asked plainly. Po sits in the
 * hero as the room's host presence: decorative, silent, and unaware of
 * everything around it (Po Rule).
 */
import { Surface } from "@/design-system/components";
import { PoCompanion, type PoMood } from "@/features/po";
import { useTranslation } from "@/foundation/localization";

export interface HomeHeroProps {
  readonly displayName: string;
  readonly isFirstTime: boolean;
  readonly hostedRoomCount: number;
  readonly mood?: PoMood;
  /** A short, decorative line from Po. Never an action. */
  readonly poLine?: string;
}

export function HomeHero({
  displayName,
  isFirstTime,
  hostedRoomCount,
  mood = "calm",
  poLine,
}: HomeHeroProps) {
  const { t } = useTranslation();

  return (
    <Surface tone="glass" padding="lg" className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(44rem 26rem at 100% -20%, var(--color-info) 0%, transparent 60%), radial-gradient(34rem 22rem at -10% 120%, var(--color-primary) 0%, transparent 60%)",
        }}
      />

      <div className="flex items-center justify-between gap-4 sm:gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("home.greeting", { name: displayName })}
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            {t("home.hero.question")}
          </h1>

        </div>

        <div className="flex shrink-0 flex-col items-center gap-2">
          <PoCompanion mood={mood} className="h-20 w-28 sm:h-28 sm:w-40" />
          {poLine ? (
            <p className="max-w-[10rem] rounded-full border border-border/60 bg-surface/60 px-3 py-1 text-center text-[0.6875rem] text-muted-foreground">
              {poLine}
            </p>
          ) : null}
        </div>
      </div>
    </Surface>
  );
}
