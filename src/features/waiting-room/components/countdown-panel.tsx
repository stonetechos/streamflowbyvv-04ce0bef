/**
 * Countdown panel — Sprint 2.3.
 *
 * What the lobby shows while everyone gets ready to press play together: the
 * live number, who asked for it, and — for the host only — start, cancel, and
 * restart. There are no playback controls here and there will not be any in
 * this sprint: reaching zero is the end of the flow.
 *
 * Motion is a single width transition, which the global reduced-motion rules
 * neutralise; the number itself is text, so the countdown remains legible with
 * animation disabled. Spoken updates come from the hook's announcer, so this
 * panel's own live region is off to avoid double-announcing.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { RoomCountdownModel } from "../use-room-countdown";
import type { MemberView } from "../waiting-room.types";

export interface CountdownPanelProps {
  readonly countdown: RoomCountdownModel;
  readonly isHost: boolean;
  readonly members: readonly MemberView[];
  /** Blocks Start until the host has chosen what the room will watch. */
  readonly hasProvider: boolean;
}

const STATE_KEYS: Readonly<Record<string, string>> = {
  idle: "room.countdown.state.idle",
  preparing: "room.countdown.state.preparing",
  counting_down: "room.countdown.state.counting_down",
  cancelled: "room.countdown.state.cancelled",
  completed: "room.countdown.state.completed",
  expired: "room.countdown.state.expired",
};

export function CountdownPanel({ countdown, isHost, members, hasProvider }: CountdownPanelProps) {
  const { t } = useTranslation();

  const requester = countdown.requestedByProfileId
    ? (members.find((member) => member.profileId === countdown.requestedByProfileId) ?? null)
    : null;

  const isCounting = countdown.state === "counting_down" || countdown.state === "preparing";
  const busy = countdown.pending !== null;
  const percent = Math.round(countdown.elapsedRatio * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("room.countdown.title")}</CardTitle>
        <CardDescription>
          {t(isHost ? "room.countdown.description.host" : "room.countdown.description.guest")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-3">
          <span
            className={cn(
              "text-4xl font-semibold tabular-nums tracking-tight",
              isCounting ? "text-primary" : "text-muted-foreground",
            )}
          >
            {isCounting ? countdown.remainingSeconds : "—"}
          </span>
          <span className="text-sm text-muted-foreground">
            {t(STATE_KEYS[countdown.state] ?? "room.countdown.state.idle")}
          </span>
        </div>

        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="presentation"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear"
            style={{ width: `${isCounting ? percent : 0}%` }}
          />
        </div>

        {requester ? (
          <p className="text-xs text-muted-foreground">
            {t("room.countdown.started_by", { host: requester.label })}
          </p>
        ) : null}

        {countdown.reason ? (
          <p className="text-xs text-muted-foreground">
            {t(`room.countdown.reason.${countdown.reason}`)}
          </p>
        ) : null}

        {countdown.error ? (
          <p className="text-xs text-destructive" role="alert">
            {t(countdown.error.messageKey)}
          </p>
        ) : null}

        {isHost ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={countdown.start}
              disabled={!countdown.isAvailable || busy || isCounting || !hasProvider}
            >
              {t("room.countdown.action.start")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={countdown.cancel}
              disabled={!countdown.isAvailable || busy || !isCounting}
            >
              {t("room.countdown.action.cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={countdown.restart}
              disabled={!countdown.isAvailable || busy || !isCounting}
            >
              {t("room.countdown.action.restart")}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("room.countdown.guest_hint")}</p>
        )}

        {isHost && !hasProvider ? (
          <p className="text-xs text-muted-foreground">{t("room.countdown.needs_provider")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
