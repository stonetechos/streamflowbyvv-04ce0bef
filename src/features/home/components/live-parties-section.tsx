/**
 * Live watch parties — Milestone H2 (product experience).
 *
 * The rooms happening right now, presented the way a consumer expects: a
 * poster-shaped tile, who is hosting, and one obvious way in. Reuses the
 * existing `HomeSnapshot.liveRooms` read — no extra queries.
 */
import { Link } from "@tanstack/react-router";

import { Avatar, EmptyState, SectionHeader, Surface, presetForName } from "@/design-system/components";
import { PoCompanion } from "@/features/po";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";
import type { HomeRoomSummary } from "@/domain";

export interface LivePartiesSectionProps {
  readonly rooms: readonly HomeRoomSummary[];
  readonly action?: React.ReactNode;
}

/** Poster placeholder: never a grey box — a calm token gradient with initials. */
function PosterTile({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex aspect-[16/9] w-full items-center justify-center rounded-xl",
        "bg-gradient-to-br from-primary/60 via-info/35 to-accent",
        "font-display text-xl font-semibold tracking-tight text-primary-foreground",
      )}
    >
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function LivePartiesSection({ rooms, action }: LivePartiesSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4" aria-labelledby="live-parties-heading">
      <SectionHeader
        title={t("home.live.title")}
        description={t("home.live.description")}
        {...(action ? { action } : {})}
      />

      {rooms.length === 0 ? (
        <EmptyState
          title={t("home.live.empty.title")}
          description={t("home.live.empty.description")}
          illustration={<PoCompanion mood="waiting" className="h-20 w-28" />}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map(({ room, memberCount, isHost }) => (
            <li key={room.id}>
              <Surface padding="sm" interactive className="flex h-full flex-col gap-3">
                <PosterTile label={room.name} />

                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold">{room.name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-success motion-safe:animate-pulse"
                      />
                      {t("home.live.badge")}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{t("home.room.members", { count: memberCount, capacity: room.maxMembers })}</span>
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar
                      name={room.name}
                      preset={presetForName(room.name)}
                      size="sm"
                      aria-hidden="true"
                    />
                    {isHost ? t("home.room.you_host") : t("home.live.host_other")}
                  </span>

                  <Link
                    to="/rooms/$roomId"
                    params={{ roomId: room.id }}
                    className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {t("home.live.join")}
                  </Link>
                </div>
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
