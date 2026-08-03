/**
 * Playback readiness panel — Sprint 2.4, extended in Sprint 2.7.
 *
 * What the lobby shows once the countdown reached zero: the room is ready,
 * and everyone presses play in their own app. There is deliberately no play,
 * pause, or seek control here — StreamFlow does not drive anybody's player,
 * and this sprint builds orchestration only.
 *
 * Sprint 2.7 replaces the single static readiness line with the four states
 * the synchronization pipeline can report: Playback Ready, Synchronization
 * Ready, Waiting for Manual Play, and Waiting for Re-sync. Every one of them
 * is informational — there is still no play, pause, or seek control here.
 *
 * The panel is pure presentation: it renders the models the hooks hand it and
 * decides nothing. It never classifies drift, derives a position, or judges
 * readiness; those answers come from `PlaybackSyncEngine`. Spoken updates come from the hook's announcer, so this
 * panel has no live region of its own.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { PlaybackSyncModel } from "../use-playback-sync";
import { PLAYBACK_SYNC_DECISION_KEYS } from "../use-playback-sync";
import type { RoomPlaybackModel } from "../use-room-playback";
import type { MemberView } from "../waiting-room.types";

export interface PlaybackReadinessPanelProps {
  readonly playback: RoomPlaybackModel;
  readonly members: readonly MemberView[];
  /** True while the countdown itself has finished, before the room is armed. */
  readonly countdownCompleted: boolean;
  /** Sprint 2.7 — the room's synchronization verdict, decided by Domain. */
  readonly sync?: PlaybackSyncModel;
}

const STATE_KEYS: Readonly<Record<string, string>> = {
  idle: "room.playback.state.idle",
  queued: "room.playback.state.queued",
  ready: "room.playback.state.ready",
  playing: "room.playback.state.playing",
  paused: "room.playback.state.paused",
  seeking: "room.playback.state.seeking",
  completed: "room.playback.state.completed",
  error: "room.playback.state.error",
};

export function PlaybackReadinessPanel({
  playback,
  members,
  countdownCompleted,
  sync,
}: PlaybackReadinessPanelProps) {
  const { t } = useTranslation();

  // Nothing to say before the countdown has finished at least once.
  if (!countdownCompleted && playback.state === "idle") return null;

  const owner = playback.ownerProfileId
    ? (members.find((member) => member.profileId === playback.ownerProfileId) ?? null)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("room.playback.title")}</CardTitle>
        <CardDescription>{t("room.playback.description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <p
          className={cn(
            "text-sm font-medium",
            playback.isReady ? "text-primary" : "text-muted-foreground",
          )}
        >
          {t(STATE_KEYS[playback.state] ?? "room.playback.state.idle")}
        </p>

        {sync ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              {t("room.playback_sync.status.playback_ready")}:{" "}
              {t(sync.isPlaybackReady ? "common.yes" : "common.no")}
            </li>
            <li>
              {t("room.playback_sync.status.synchronization_ready")}:{" "}
              {t(sync.isSynchronizationReady ? "common.yes" : "common.no")}
            </li>
            {sync.isWaitingForManualPlay ? (
              <li className="text-foreground">
                {t("room.playback_sync.status.waiting_for_manual_play")}
              </li>
            ) : null}
            {sync.isWaitingForResync ? (
              <li className="text-destructive">
                {t("room.playback_sync.status.waiting_for_resync")}
              </li>
            ) : null}
            <li>{t(PLAYBACK_SYNC_DECISION_KEYS[sync.decision])}</li>
            {sync.correctionKind !== "none" ? (
              <li>{t(`room.playback_sync.correction.${sync.correctionKind}`)}</li>
            ) : null}
          </ul>
        ) : null}

        {playback.isArming ? (
          <p className="text-xs text-muted-foreground">{t("room.playback.arming")}</p>
        ) : null}

        {playback.isReady ? (
          <p className="text-xs text-muted-foreground">{t("room.playback.press_play_hint")}</p>
        ) : null}

        {owner ? (
          <p className="text-xs text-muted-foreground">
            {t("room.playback.owner", { owner: owner.label })}
          </p>
        ) : null}

        {playback.error ? (
          <p className="text-xs text-destructive" role="alert">
            {t(playback.error.messageKey)}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">{t("room.playback.no_control_notice")}</p>
      </CardContent>
    </Card>
  );
}
