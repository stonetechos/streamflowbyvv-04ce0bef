/**
 * Room stage — Watch Party Engine v2.0.
 *
 * The lobby's cinema frontage: artwork edge to edge, the title over it, the
 * service, the episode, the runtime, and who is hosting. One honest line says
 * what the room can expect from this service (ADR-014 tiers) — no diagnostics,
 * no status vocabulary, no raw identifiers.
 *
 * Presentation only. Every value arrives already decided.
 */
import {
  parseContentReference,
  providerTier,
  providerTierSummaryKey,
  readSeriesTitle,
} from "@/domain";
import { ContentPoster } from "@/features/shared/content-poster";
import { useTranslation } from "@/foundation/localization";

import type { RoomSummaryView } from "../waiting-room.types";

export interface RoomStageProps {
  readonly room: RoomSummaryView;
  readonly providerName: string | null;
  /** Brand key of the chosen service, for the fallback brand mark. */
  readonly providerKey?: string | null;
  readonly hostLabel: string | null;
  /** True once this member's voice channel is live. */
  readonly isVoiceConnected?: boolean;
}

function runtimeLabel(durationMs: number | null | undefined): string | null {
  if (!durationMs || durationMs <= 0) return null;
  const minutes = Math.round(durationMs / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function RoomStage({
  room,
  providerName,
  providerKey,
  hostLabel,
  isVoiceConnected = false,
}: RoomStageProps) {
  const { t } = useTranslation();

  const reference = parseContentReference(room.contentReference);
  const seriesTitle = readSeriesTitle(reference);
  const title = reference?.title ?? room.name;
  const headline = seriesTitle ?? title;
  const tier = providerTier(reference?.providerKey ?? providerKey);
  const runtime = runtimeLabel(reference?.durationMs ?? null);

  const episodeLabel =
    reference?.seasonNumber !== null && reference?.seasonNumber !== undefined
      ? t("room.provider.episode_value", {
          season: reference.seasonNumber,
          episode: reference.episodeNumber ?? 0,
        })
      : null;

  const subline = [episodeLabel, seriesTitle && title !== seriesTitle ? title : null, runtime]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="text-left">
      <div className="relative overflow-hidden rounded-3xl shadow-e3">
        <ContentPoster
          artworkUrl={reference?.artworkUrl ?? null}
          brandKey={reference?.providerKey ?? providerKey ?? null}
          name={providerName ?? headline}
          className="aspect-[16/9] w-full rounded-3xl border-0"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent"
        />

        {/* Sprint 85 — the brand mark already names the service when it stands
            in for missing artwork; the chip would only repeat it. */}
        {providerName && reference?.artworkUrl ? (
          <span className="absolute left-4 top-4 inline-flex rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide backdrop-blur">
            {providerName}
          </span>
        ) : null}


        {isVoiceConnected ? (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-success/20 px-2.5 py-1 text-[11px] font-semibold text-success backdrop-blur">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
            {t("room.stage.voice_connected")}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 space-y-1 p-4 sm:p-5">
          <h1 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {headline}
          </h1>
          {subline ? <p className="text-sm text-muted-foreground">{subline}</p> : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {hostLabel ? (
          <p className="text-sm text-muted-foreground">
            {t("room.stage.hosted_by", { host: hostLabel })}
          </p>
        ) : (
          <span />
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{t(providerTierSummaryKey(tier))}</p>
    </section>
  );
}
