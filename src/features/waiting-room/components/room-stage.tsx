/**
 * Room stage — UX Simplification Pass.
 *
 * The lobby's answer to "what are we watching?": artwork first, then the
 * title, then the episode, then the service, then who is hosting. No status
 * vocabulary, no diagnostics, no empty placeholders.
 *
 * Presentation only. Every value arrives already decided.
 */
import { parseContentReference, readSeriesTitle } from "@/domain";
import { ContentPoster } from "@/features/shared/content-poster";
import { useTranslation } from "@/foundation/localization";

import type { RoomSummaryView } from "../waiting-room.types";

export interface RoomStageProps {
  readonly room: RoomSummaryView;
  readonly providerName: string | null;
  /** Brand key of the chosen service, for the fallback brand mark. */
  readonly providerKey?: string | null;
  readonly hostLabel: string | null;
}

export function RoomStage({ room, providerName, providerKey, hostLabel }: RoomStageProps) {
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
    <section className="flex flex-col items-center text-center">
      <ContentPoster
        artworkUrl={reference?.artworkUrl ?? null}
        brandKey={reference?.providerKey ?? providerKey ?? null}
        name={providerName ?? title}
        className="aspect-[16/9] w-full max-w-md rounded-3xl shadow-e3"
      />

      <h1 className="mt-5 max-w-md text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {seriesTitle ?? title}
      </h1>

      {episodeLabel || (seriesTitle && title !== seriesTitle) ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {[episodeLabel, seriesTitle && title !== seriesTitle ? title : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      {providerName ? (
        <p className="mt-3 inline-flex items-center rounded-full border border-border/60 bg-surface/60 px-3 py-1 text-xs font-medium tracking-wide">
          {providerName}
        </p>
      ) : null}

      {hostLabel ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("room.stage.hosted_by", { host: hostLabel })}
        </p>
      ) : null}
    </section>
  );
}
