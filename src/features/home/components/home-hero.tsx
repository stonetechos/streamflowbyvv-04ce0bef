/**
 * Home hero — Milestone E.
 *
 * The greeting and the two things a person most often wants to do. Po sits in
 * the hero as the room's host presence: decorative, silent, and unaware of
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
}

export function HomeHero({
  displayName,
  isFirstTime,
  hostedRoomCount,
  mood = "calm",
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
            {t("common.app.name")}
          </p>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-4xl">
            {t("home.greeting", { name: displayName })}
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            {isFirstTime
              ? t("home.subtitle.first_time")
              : t("home.subtitle.returning", { count: hostedRoomCount })}
          </p>
        </div>

        <PoCompanion mood={mood} className="h-20 w-28 shrink-0 sm:h-28 sm:w-40" />
      </div>
    </Surface>
  );
}
