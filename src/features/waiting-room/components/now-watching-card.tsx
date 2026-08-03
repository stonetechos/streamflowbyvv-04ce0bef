/**
 * Now watching card — Milestone L.
 *
 * The lobby is content-first: people are waiting to watch a specific title,
 * not sitting in a generic room. Artwork (or the provider's brand mark) leads,
 * then the title, then who is hosting and how many have arrived.
 *
 * Presentation only. Every value was decided upstream — the content reference
 * by the share intake, the status by the room lifecycle, the roster by the
 * presence coordinator. This card claims nothing about playback.
 */
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/design-system/components";
import { parseContentReference, readSeriesTitle } from "@/domain";
import { ContentPoster } from "@/features/shared/content-poster";
import { useTranslation } from "@/foundation/localization";

import type { RoomSummaryView } from "../waiting-room.types";

export interface NowWatchingCardProps {
  readonly room: RoomSummaryView;
  /** Display name of the chosen provider, when one is known. */
  readonly providerName: string | null;
  readonly hostLabel: string | null;
  readonly memberCount: number;
  readonly isLive: boolean;
}

export function NowWatchingCard({
  room,
  providerName,
  hostLabel,
  memberCount,
  isLive,
}: NowWatchingCardProps) {
  const { t } = useTranslation();

  const reference = parseContentReference(room.contentReference);
  const seriesTitle = readSeriesTitle(reference);
  const title = reference?.title ?? room.name;
  const episodeLabel =
    reference?.seasonNumber !== null && reference?.seasonNumber !== undefined
      ? t("room.provider.episode_value", {
          season: reference.seasonNumber,
          episode: reference.episodeNumber ?? 0,
        })
      : null;

  return (
    <Surface tone="glass" padding="lg">
      <div className="flex flex-col gap-5 sm:flex-row">
        <ContentPoster
          artworkUrl={reference?.artworkUrl ?? null}
          brandKey={reference?.providerKey ?? null}
          name={providerName ?? room.name}
          className="aspect-[16/10] w-full shrink-0 sm:w-52"
        />

        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("room.now_watching.eyebrow")}
          </p>

          <div className="min-w-0">
            {seriesTitle ? (
              <p className="truncate text-sm text-muted-foreground">{seriesTitle}</p>
            ) : null}
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {episodeLabel ? <Badge variant="outline">{episodeLabel}</Badge> : null}
            <Badge variant="outline">{providerName ?? t("room.provider.none")}</Badge>
            <Badge variant={isLive ? "default" : "secondary"}>
              {t(`room.status.${room.status}`)}
            </Badge>
          </div>

          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <dt className="text-muted-foreground">{t("room.now_watching.hosted_by")}</dt>
              <dd className="truncate font-medium">
                {hostLabel ?? t("room.provider.host_unknown")}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <dt className="text-muted-foreground">{t("room.now_watching.participants")}</dt>
              <dd className="font-medium">
                {t("room.now_watching.participant_count", {
                  count: memberCount,
                  capacity: room.capacity,
                })}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Surface>
  );
}
