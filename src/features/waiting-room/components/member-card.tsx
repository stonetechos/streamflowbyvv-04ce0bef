/**
 * Member card — Milestone G.
 *
 * The production roster tile. It shows one member's whole standing at a
 * glance: identity, host badge, presence, voice, speaking, readiness, and the
 * synchronization band the room measured for them.
 *
 * It derives nothing. Every value arrives already decided by Domain — the card
 * only chooses how to say it.
 */
import type { SyncHealth } from "@/domain";
import { VoiceIndicator, type VoiceIndicatorState } from "@/features/voice";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import { SYNC_HEALTH_KEYS } from "../use-room-clock-sync";
import type { MemberView } from "../waiting-room.types";
import { PresenceIndicator } from "./presence-indicator";

export interface MemberCardProps {
  readonly member: MemberView;
  readonly voice: VoiceIndicatorState;
  /** The member's clock band, when the room measured one. */
  readonly syncHealth: SyncHealth | null;
  readonly className?: string;
}

const NEUTRAL_TONE = "bg-muted text-muted-foreground";

const SYNC_TONE: Readonly<Record<string, string>> = {
  excellent: "bg-success/12 text-success",
  good: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  resync_required: "bg-destructive/12 text-destructive",
};

export function MemberCard({ member, voice, syncHealth, className }: MemberCardProps) {
  const { t } = useTranslation();
  const speaking = voice === "speaking";

  return (
    <li
      className={cn(
        "sf-member-enter relative flex items-center gap-3 rounded-2xl border p-3 transition-[border-color,box-shadow,transform] duration-normal ease-standard",
        speaking ? "border-primary/60 shadow-e2" : "border-border",
        member.state === "left" ? "opacity-60" : "",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold uppercase",
          speaking ? "sf-voice-speaking ring-2 ring-primary/60" : "",
        )}
      >
        {member.label.slice(0, 2)}
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          <span className="truncate font-mono">{member.label}</span>
          {member.isViewer ? (
            <span className="shrink-0 text-xs text-muted-foreground">{t("room.member.you")}</span>
          ) : null}
          {member.isHost ? (
            <span className="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-[0.6875rem] font-semibold text-primary">
              {t("room.member.host_badge")}
            </span>
          ) : null}
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <PresenceIndicator presence={member.presence} lastSeenMinutes={member.lastSeenMinutes} />
          <VoiceIndicator state={voice} />
          {syncHealth ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
                SYNC_TONE[syncHealth] ?? NEUTRAL_TONE,
              )}
            >
              {t(SYNC_HEALTH_KEYS[syncHealth])}
            </span>
          ) : null}
        </div>
      </div>

      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold",
          member.isReady ? "bg-success/12 text-success" : "bg-muted text-muted-foreground",
        )}
      >
        <span aria-hidden="true" className="mr-1">
          {member.isReady ? "\u2713" : "\u00b7"}
        </span>
        {t(member.isReady ? "room.member.ready" : "room.member.not_ready")}
      </span>
    </li>
  );
}
