/**
 * Room console — Phase A.
 *
 * The room's live readout while playback is happening somewhere StreamFlow
 * cannot see. It shows the title and service as the subject, the room's own
 * phase, a labelled clock, and — for the host — the declarations that keep
 * everyone on the same page. It never claims to observe a provider player,
 * and the disclosure saying so is part of the panel, not a footnote.
 */
import { ActionButton, Surface } from "@/design-system/components";
import { formatRoomClock, type RoomConsoleAction, type RoomConsoleView } from "@/domain";
import { useTranslation } from "@/foundation/localization";

export interface RoomConsoleProps {
  readonly view: RoomConsoleView;
  readonly providerName: string;
  /** What the room picked, when it has a name. */
  readonly title: string | null;
  readonly participantCount: number;
  readonly readyCount: number;
  readonly launchedCount: number;
  readonly countdownSeconds: number | null;
  readonly busy?: boolean;
  onAct(action: RoomConsoleAction): void;
}

const ACTION_KEYS: Readonly<Record<RoomConsoleAction, string>> = {
  "declare-start": "room.console.action.start",
  "declare-pause": "room.console.action.pause",
  "declare-resume": "room.console.action.resume",
  "restart-countdown": "room.console.action.restart_countdown",
};

export function RoomConsole({
  view,
  providerName,
  title,
  participantCount,
  readyCount,
  launchedCount,
  countdownSeconds,
  busy = false,
  onAct,
}: RoomConsoleProps) {
  const { t } = useTranslation();

  return (
    <Surface
      tone="card"
      padding="md"
      className="flex flex-col gap-3"
      data-sf-room-console={view.phase}
      data-sf-room-clock={view.clock.kind}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium"
          data-sf-console-phase={view.phase}
        >
          <span
            aria-hidden="true"
            className={`size-1.5 rounded-full bg-primary ${view.clock.isRunning ? "motion-safe:animate-pulse" : ""}`}
          />
          {t(view.phaseKey)}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("room.console.people", {
            count: participantCount,
            ready: readyCount,
            launched: launchedCount,
          })}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{providerName}</p>
        <p className="text-balance text-lg font-semibold" data-sf-console-title>
          {title ?? t("room.console.untitled", { provider: providerName })}
        </p>
      </div>

      <div className="flex items-baseline gap-2">
        {countdownSeconds !== null ? (
          <span className="text-3xl font-semibold tabular-nums" data-sf-console-countdown>
            {countdownSeconds}
          </span>
        ) : (
          <span className="text-3xl font-semibold tabular-nums" data-sf-console-clock>
            {view.clock.kind === "none" ? "--:--" : formatRoomClock(view.clock.elapsedMs)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{t(view.clock.labelKey)}</span>
      </div>

      {view.disclosureKeys.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-xl bg-muted/40 px-3 py-2" data-sf-console-disclosure>
          {view.disclosureKeys.map((key) => (
            <p key={key} className="text-xs text-muted-foreground">
              {t(key, { provider: providerName })}
            </p>
          ))}
        </div>
      ) : null}

      {view.hostActions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {view.hostActions.map((action) => (
              <ActionButton
                key={action}
                tone={action === "restart-countdown" ? "secondary" : "primary"}
                size="sm"
                disabled={busy}
                onClick={() => onAct(action)}
                data-sf-console-action={action}
              >
                {t(ACTION_KEYS[action])}
              </ActionButton>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("room.console.host_note", { provider: providerName })}
          </p>
        </div>
      ) : null}
    </Surface>
  );
}
