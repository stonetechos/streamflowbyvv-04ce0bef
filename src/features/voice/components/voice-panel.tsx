/**
 * Voice panel — Milestone G.
 *
 * The lobby's voice surface: who is on the call, who is speaking, and the
 * controls. It renders the roster the transport reports, not the room's
 * membership — the two are deliberately different lists.
 */
import { Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { VoiceSessionModel } from "../use-voice-session";
import { VoiceControls } from "./voice-controls";

export interface VoicePanelProps {
  readonly voice: VoiceSessionModel;
  readonly className?: string;
}

export function VoicePanel({ voice, className }: VoicePanelProps) {
  const { t } = useTranslation();

  return (
    <Surface padding="lg" className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{t("voice.panel.title")}</h2>
        <p className="text-xs text-muted-foreground">
          {voice.isConnected
            ? t("voice.panel.count", { count: voice.members.length })
            : t("voice.panel.subtitle")}
        </p>
      </div>

      <VoiceControls voice={voice} />

      {voice.isConnected && voice.members.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={t("voice.panel.roster_label")}>
          {voice.members.map((member) => (
            <li
              key={member.profileId}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors duration-fast",
                member.isSpeaking
                  ? "sf-voice-speaking border-primary/50 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              <span aria-hidden="true">{member.isMuted ? "\u{1F507}" : "\u{1F3A4}"}</span>
              <span className="max-w-32 truncate font-medium">
                {member.isSelf ? t("voice.panel.you") : member.displayName}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Surface>
  );
}
