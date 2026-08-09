/**
 * Participant rail — Sprint H5.
 *
 * Who is in the room and what state they are actually in. Every state shown
 * here comes from presence or from a person's own "I'm ready" tap; the room
 * never infers that somebody is watching, and never renders speaking status,
 * because no voice telemetry exists to support that claim.
 */
import { ActionButton, Avatar, Surface } from "@/design-system/components";
import type { ParticipantRuntime, PresenceFreshness, ReadinessSummary } from "@/domain";
import { useTranslation } from "@/foundation/localization";

export interface ParticipantRailProps {
  readonly participants: readonly ParticipantRuntime[];
  readonly readiness: ReadinessSummary;
  /** Readiness is only meaningful when the room coordinates manually. */
  readonly showReadiness: boolean;
  /**
   * Phase A — observed per-person facts. Readiness is a person's own tap,
   * "launched" is their own announcement, freshness is presence. Nothing here
   * is inferred from a provider player, because none can be read.
   */
  readonly facts?: {
    readonly readyProfileIds: ReadonlySet<string>;
    readonly launchedProfileIds: ReadonlySet<string>;
    readonly freshnessByProfileId: ReadonlyMap<string, PresenceFreshness>;
    /** True when the room is coordinated by humans, not by the app. */
    readonly isManual: boolean;
  } | null;
  /**
   * Sprint H6 — moderation affordances, rendered only for a seat that may act.
   * Voice and mute state come from observation, never from inference.
   */
  readonly moderation?: {
    readonly canMute: boolean;
    readonly canRemove: boolean;
    readonly mutedProfileIds: ReadonlySet<string>;
    readonly memberIdByProfileId: ReadonlyMap<string, string>;
    readonly busy: boolean;
    onMute(memberId: string, muted: boolean): void;
    onRemove(memberId: string): void;
  } | null;
  /** Profile ids the voice transport reports as connected. */
  readonly voiceProfileIds?: ReadonlySet<string>;
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

/** A small, uniform status pill. Local to the rail: it states, never infers. */
function Badge({
  tone,
  testId,
  children,
}: {
  readonly tone: "positive" | "neutral" | "warning";
  readonly testId: string;
  readonly children: React.ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "border-primary/40 bg-primary/10"
      : tone === "warning"
        ? "border-destructive/40 bg-destructive/10"
        : "border-border/60 bg-muted/50";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${toneClass}`}
      data-sf-participant-badge={testId}
    >
      {children}
    </span>
  );
}

const FRESHNESS_KEY: Record<PresenceFreshness, string> = {

  live: "room.participant.badge.live",
  stale: "room.participant.badge.stale",
  offline: "room.participant.badge.offline",
};

export function ParticipantRail({
  participants,
  readiness,
  showReadiness,
  facts = null,
  moderation = null,
  voiceProfileIds,
}: ParticipantRailProps) {
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
        {participants.map((participant) => {
          const freshness = facts?.freshnessByProfileId.get(participant.participantId) ?? null;
          return (
          <li
            key={participant.participantId}
            className="flex flex-wrap items-center gap-x-3 gap-y-1"
            data-sf-participant={participant.state}
          >
            <Avatar name={participant.displayName} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm">
              {participant.displayName}
              {participant.isHost ? ` · ${t("theater.header.host")}` : ""}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {voiceProfileIds?.has(participant.participantId)
                ? t("room.participant.in_voice")
                : t(STATE_KEY[participant.state])}
            </span>
            {facts ? (
              <span className="flex w-full flex-wrap gap-1 pl-11" data-sf-participant-badges>
                {facts.readyProfileIds.has(participant.participantId) ? (
                  <Badge tone="positive" testId="ready">
                    {t("room.participant.badge.ready")}
                  </Badge>
                ) : null}
                {facts.launchedProfileIds.has(participant.participantId) ? (
                  <Badge tone="neutral" testId="launched">
                    {t("room.participant.badge.launched")}
                  </Badge>
                ) : null}
                {freshness && freshness !== "live" ? (
                  <Badge tone="warning" testId={`freshness-${freshness}`}>
                    {t(FRESHNESS_KEY[freshness])}
                  </Badge>
                ) : null}
                {facts.isManual ? (
                  <Badge tone="neutral" testId="manual">
                    {t("room.participant.badge.manual")}
                  </Badge>
                ) : null}
              </span>
            ) : null}

            {moderation && !participant.isHost ? (
              <span className="flex shrink-0 gap-1">
                {moderation.canMute ? (
                  <ActionButton
                    tone="ghost"
                    size="sm"
                    className="min-h-11"
                    disabled={moderation.busy}
                    onClick={() => {
                      const memberId = moderation.memberIdByProfileId.get(
                        participant.participantId,
                      );
                      if (memberId) {
                        moderation.onMute(
                          memberId,
                          !moderation.mutedProfileIds.has(participant.participantId),
                        );
                      }
                    }}
                  >
                    {moderation.mutedProfileIds.has(participant.participantId)
                      ? t("room.host.unmute_member")
                      : t("room.host.mute_member")}
                  </ActionButton>
                ) : null}
                {moderation.canRemove ? (
                  <ActionButton
                    tone="ghost"
                    size="sm"
                    className="min-h-11"
                    disabled={moderation.busy}
                    onClick={() => {
                      const memberId = moderation.memberIdByProfileId.get(
                        participant.participantId,
                      );
                      if (memberId) moderation.onRemove(memberId);
                    }}
                  >
                    {t("room.host.remove_member")}
                  </ActionButton>
                ) : null}
              </span>
            ) : null}
          </li>
          );
        })}

      </ul>
    </Surface>
  );
}
