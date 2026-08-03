/**
 * Playback readiness panel — Sprint 2.4.
 *
 * What the lobby shows once the countdown reached zero: the room is ready,
 * and everyone presses play in their own app. There is deliberately no play,
 * pause, or seek control here — StreamFlow does not drive anybody's player,
 * and this sprint builds orchestration only.
 *
 * The panel is pure presentation: it renders the model the hook hands it and
 * decides nothing. Spoken updates come from the hook's announcer, so this
 * panel has no live region of its own.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { RoomPlaybackModel } from "../use-room-playback";
import type { MemberView } from "../waiting-room.types";

export interface PlaybackReadinessPanelProps {
  readonly playback: RoomPlaybackModel;
  readonly members: readonly MemberView[];
  /** True while the countdown itself has finished, before the room is armed. */
  readonly countdownCompleted: boolean;
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
