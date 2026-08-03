/**
 * Continue Watching Together — Milestone E.
 *
 * The single most compelling thing on the home screen: the room this person
 * can walk straight back into. Which room that is was decided by
 * `HomeReadModel`; this card only renders the verdict.
 */
import { Link } from "@tanstack/react-router";

import { Surface } from "@/design-system/components";
import { PoCompanion } from "@/features/po";
import { useTranslation } from "@/foundation/localization";
import type { HomeRoomSummary } from "@/domain";

export interface ContinueWatchingCardProps {
  readonly summary: HomeRoomSummary;
}

export function ContinueWatchingCard({ summary }: ContinueWatchingCardProps) {
  const { t } = useTranslation();
  const { room, memberCount, isHost } = summary;

  return (
    <Surface
      tone="glass"
      padding="lg"
      className="relative isolate overflow-hidden"
      aria-labelledby="continue-room-title"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(38rem 22rem at 8% -30%, var(--color-primary) 0%, transparent 60%), radial-gradient(30rem 20rem at 105% 130%, var(--color-info) 0%, transparent 60%)",
        }}
      />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-success motion-safe:animate-pulse"
            />
            {t("home.continue.eyebrow")}
          </p>

          <h2
            id="continue-room-title"
            className="mt-3 truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {room.name}
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {t("home.room.members", { count: memberCount, capacity: room.maxMembers })}
            {" · "}
            {t(`room.status.${room.status}`)}
            {isHost ? ` · ${t("home.room.you_host")}` : ""}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/rooms/$roomId"
              params={{ roomId: room.id }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-e1 transition-colors hover:bg-primary/90"
            >
              {t("home.continue.action")}
            </Link>
            <span className="font-mono text-xs text-muted-foreground">{room.code}</span>
          </div>
        </div>

        <PoCompanion mood="happy" className="h-28 w-40 shrink-0 self-end sm:self-center" />
      </div>
    </Surface>
  );
}
