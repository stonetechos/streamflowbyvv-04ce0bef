/**
 * Watch Party screen — Watch Party Engine v2.0.
 *
 * Once the countdown lands, StreamFlow gets out of the way. What remains is a
 * cinematic reminder of what the room is watching, who is in it, and a single
 * floating HUD.
 *
 * The one thing this screen never does is touch a player: no play, no pause,
 * no seek is sent anywhere (MVP §5, ADR-003, ADR-014).
 */
import { useState } from "react";

import { Surface } from "@/design-system/components";
import {
  parseContentReference,
  providerTier,
  providerTierSummaryKey,
  readSeriesTitle,
} from "@/domain";
import { PoCompanion } from "@/features/po";
import { ContentPoster } from "@/features/shared/content-poster";
import { VoicePanel, type VoiceIndicatorState } from "@/features/voice";
import {
  MemberList,
  type MemberView,
  type PlaybackSyncModel,
  type RoomClockSyncModel,
  type RoomSummaryView,
} from "@/features/waiting-room";
import { useTranslation } from "@/foundation/localization";
import type { SyncHealth } from "@/domain";
import type { VoiceSessionModel } from "@/features/voice";

import { useElapsedTime } from "../use-elapsed-time";
import { CatchUpSheet } from "./catch-up-sheet";
import { ReactionLayer, useReactionBursts } from "./reaction-burst";
import { SharedElapsedTimer } from "./shared-elapsed-timer";
import { WatchPartyHud } from "./watch-party-hud";

export interface WatchPartyScreenProps {
  readonly room: RoomSummaryView;
  readonly members: readonly MemberView[];
  readonly providerName: string | null;
  readonly providerKey?: string | null;
  /** Room anchor the elapsed timer counts from. */
  readonly startedAt: string | null;
  readonly clockOffsetMs: number;
  readonly voice: VoiceSessionModel;
  readonly playbackSync: PlaybackSyncModel;
  readonly clockSync: RoomClockSyncModel;
  readonly voiceByProfileId: ReadonlyMap<string, VoiceIndicatorState>;
  readonly syncByProfileId: ReadonlyMap<string, SyncHealth>;
  readonly onLeave: () => void;
  readonly isLeaving: boolean;
}

export function WatchPartyScreen({
  room,
  members,
  providerName,
  providerKey = null,
  startedAt,
  clockOffsetMs,
  voice,
  voiceByProfileId,
  syncByProfileId,
  onLeave,
  isLeaving,
}: WatchPartyScreenProps) {
  const { t } = useTranslation();
  const elapsed = useElapsedTime(startedAt, clockOffsetMs);
  const reactions = useReactionBursts();
  const [catchUpOpen, setCatchUpOpen] = useState(false);

  const reference = parseContentReference(room.contentReference);
  const seriesTitle = readSeriesTitle(reference);
  const title = seriesTitle ?? reference?.title ?? room.name;
  const hostLabel = members.find((member) => member.isHost)?.label ?? null;
  const tier = providerTier(reference?.providerKey ?? providerKey);

  const episodeLabel =
    reference?.seasonNumber !== null && reference?.seasonNumber !== undefined
      ? t("room.provider.episode_value", {
          season: reference.seasonNumber,
          episode: reference.episodeNumber ?? 0,
        })
      : null;

  return (
    <section
      aria-label={t("watch_party.region_label")}
      data-sf-screen="watch-party"
      data-sf-started-at={startedAt ?? ""}
      data-sf-elapsed-seconds={elapsed.totalSeconds}
      className="sf-screen-enter mx-auto w-full max-w-2xl px-4 py-6 pb-40 sm:px-6"
    >
      <header className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("watch_party.eyebrow")}
        </p>
        <PoCompanion mood="watching" size="sm" />
      </header>

      <div className="relative mt-4 overflow-hidden rounded-3xl shadow-e3">
        <ContentPoster
          artworkUrl={reference?.artworkUrl ?? null}
          brandKey={reference?.providerKey ?? providerKey ?? null}
          name={providerName ?? title}
          className="aspect-[16/9] w-full rounded-3xl border-0"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 space-y-1 p-4 text-left">
          {providerName ? (
            <span className="inline-flex rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide backdrop-blur">
              {providerName}
            </span>
          ) : null}
          <h1 className="text-balance font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {episodeLabel ? <p className="text-sm text-muted-foreground">{episodeLabel}</p> : null}
        </div>
      </div>

      <Surface padding="lg" tone="glass" className="mt-5 space-y-4">
        <SharedElapsedTimer elapsed={elapsed} />
        <p className="text-center text-xs text-muted-foreground">
          {t(providerTierSummaryKey(tier))}
        </p>
      </Surface>

      <div className="mt-5 space-y-5">
        <MemberList
          members={members}
          readyCount={members.filter((member) => member.isReady).length}
          readyTotal={members.length}
          voiceByProfileId={voiceByProfileId}
          syncByProfileId={syncByProfileId}
        />
        <VoicePanel voice={voice} />
      </div>

      <ReactionLayer bursts={reactions.bursts} />

      <CatchUpSheet
        open={catchUpOpen}
        onOpenChange={setCatchUpOpen}
        startedAt={startedAt}
        clockOffsetMs={clockOffsetMs}
      />

      <WatchPartyHud
        hostLabel={hostLabel}
        elapsedLabel={elapsed.label}
        voice={voice}
        onReact={reactions.send}
        onCatchUp={() => setCatchUpOpen(true)}
        onLeave={onLeave}
        isLeaving={isLeaving}
      />
    </section>
  );
}
