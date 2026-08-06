/**
 * Participant rail — Sprint H5.
 *
 * Who is in the room and what state they are actually in. Every state shown
 * here comes from presence or from a person's own "I'm ready" tap; the room
 * never infers that somebody is watching, and never renders speaking status,
 * because no voice telemetry exists to support that claim.
 */
import { Avatar, Surface } from "@/design-system/components";
import type { ParticipantRuntime, ReadinessSummary } from "@/domain";
import { useTranslation } from "@/foundation/localization";

export interface ParticipantRailProps {
  readonly participants: readonly ParticipantRuntime[];
  readonly readiness: ReadinessSummary;
  /** Readiness is only meaningful when the room coordinates manually. */
  readonly showReadiness: boolean;
}

const STATE_KEY: Record<ParticipantRuntime["state"], string> = {
  joined: "room.participant.joined",
  selecting: "room.participant.selecting",
  ready: "room.participant.ready",
  watching: "room.participant.watching",
  reconnecting: "room.participant.reconnecting",
  disconnected: "room.participant.disconnected",
  left: "room.participant.left",
};

export function ParticipantRail({ participants, readiness, showReadiness }: ParticipantRailProps) {
  const { t } = useTranslation();

  return (
    <Surface tone="card" padding="md" className="flex flex-col gap-3" data-sf-participants>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{t("room.participants.title")}</p>
        {showReadiness ? (
          <span className="text-xs text-muted-foreground" data-sf-readiness>
            {t("room.readiness.count", {
              ready: readiness.readyCount,
              total: readiness.total,
            })}
          </span>
        ) : null}
      </div>

      {showReadiness && readiness.waitingFor.length > 0 ? (
        <p className="text-xs text-muted-foreground" data-sf-readiness-waiting>
          {t("room.readiness.waiting", { names: readiness.waitingFor.join(", ") })}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {participants.map((participant) => (
          <li
            key={participant.participantId}
            className="flex items-center gap-3"
            data-sf-participant={participant.state}
          >
            <Avatar name={participant.displayName} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm">
              {participant.displayName}
              {participant.isHost ? ` · ${t("theater.header.host")}` : ""}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {t(STATE_KEY[participant.state])}
            </span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
