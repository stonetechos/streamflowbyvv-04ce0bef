/**
 * Watch Party screen — Milestone G.
 *
 * Where the room lands once the countdown finishes. It answers four questions
 * and refuses to imply a fifth:
 *
 *   • How long have we been watching?  — the shared elapsed timer
 *   • Where are we watching?           — the provider, named plainly
 *   • Who is here, and who is talking? — the roster and voice
 *   • Are we still together?           — synchronization status and re-sync
 *
 * The fifth question — "can StreamFlow control my player?" — is answered no,
 * explicitly and repeatedly, by the manual-sync reminder. Nothing on this
 * screen sends a play, pause, or seek anywhere (MVP §5, ADR-003).
 */
import { ActionButton, Surface } from "@/design-system/components";
import { PoCompanion } from "@/features/po";
import { VoiceControls, VoicePanel, type VoiceIndicatorState } from "@/features/voice";
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
import { SharedElapsedTimer } from "./shared-elapsed-timer";
import { WatchPartyStatus } from "./watch-party-status";

export interface WatchPartyScreenProps {
  readonly room: RoomSummaryView;
  readonly members: readonly MemberView[];
  readonly providerName: string | null;
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
  startedAt,
  clockOffsetMs,
  voice,
  playbackSync,
  clockSync,
  voiceByProfileId,
  syncByProfileId,
  onLeave,
  isLeaving,
}: WatchPartyScreenProps) {
  const { t } = useTranslation();
  const elapsed = useElapsedTime(startedAt, clockOffsetMs);

  return (
    <section
      aria-label={t("watch_party.region_label")}
      className="sf-screen-enter mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("watch_party.eyebrow")}
          </p>
          <h1 className="mt-2 truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {room.name}
          </h1>
          <p className="mt-2 inline-flex items-center rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            {providerName
              ? t("watch_party.watching_on", { provider: providerName })
              : t("watch_party.no_provider")}
          </p>
        </div>
        <PoCompanion mood="watching" size="sm" />
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Surface padding="lg" tone="glass" className="space-y-5">
            <SharedElapsedTimer elapsed={elapsed} />
            <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-center">
              <p className="text-sm font-medium">{t("watch_party.manual_reminder.title")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("watch_party.manual_reminder.body")}
              </p>
            </div>
          </Surface>

          <WatchPartyStatus
            sync={playbackSync}
            health={clockSync.health}
            isMeasuring={clockSync.isMeasuring}
            onResync={clockSync.remeasure}
          />

          <MemberList
            members={members}
            readyCount={members.filter((member) => member.isReady).length}
            readyTotal={members.length}
            voiceByProfileId={voiceByProfileId}
            syncByProfileId={syncByProfileId}
          />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20">
          <VoicePanel voice={voice} />
          <Surface padding="lg" className="space-y-3">
            <h2 className="font-display text-base font-semibold">{t("watch_party.leave.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("watch_party.leave.body")}</p>
            <ActionButton tone="ghost" onClick={onLeave} loading={isLeaving}>
              {t("watch_party.leave.action")}
            </ActionButton>
          </Surface>
        </aside>
      </div>

      {/* Mobile: the call stays reachable without scrolling. */}
      <div className="sf-watch-bar fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <span className="font-mono text-sm tabular-nums">{elapsed.label}</span>
          <VoiceControls voice={voice} compact />
        </div>
      </div>
      <div aria-hidden="true" className="h-20 lg:hidden" />
    </section>
  );
}
