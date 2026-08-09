/**
 * Party controls — the call-style cluster in the theatre's top-left corner.
 *
 * Three round controls, nothing more: leave the party, hold the microphone,
 * open the room's own menu. They read as a call because that is what the room
 * is — people together — and they never imply control over a provider player.
 */
import { EllipsisVertical, Mic, MicOff, PhoneOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/foundation/localization";

export interface PartyControlsProps {
  readonly isVoiceConnected: boolean;
  readonly isMuted: boolean;
  readonly canUseVoice: boolean;
  readonly isLeaving: boolean;
  onLeave(): void;
  onToggleVoice(): void;
  onOpenMenu(): void;
}

const ROUND =
  "inline-flex size-10 items-center justify-center rounded-full transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

export function PartyControls({
  isVoiceConnected,
  isMuted,
  canUseVoice,
  isLeaving,
  onLeave,
  onToggleVoice,
  onOpenMenu,
}: PartyControlsProps) {
  const { t } = useTranslation();
  const micOn = isVoiceConnected && !isMuted;

  return (
    <div className="flex items-center gap-2" data-sf-party-controls>
      <button
        type="button"
        onClick={onLeave}
        disabled={isLeaving}
        aria-label={t("theater.action.leave")}
        title={t("theater.action.leave")}
        data-sf-party-leave
        className={cn(ROUND, "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
      >
        <PhoneOff className="size-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onToggleVoice}
        disabled={!canUseVoice}
        aria-pressed={micOn}
        aria-label={micOn ? t("party.control.mic_on") : t("party.control.mic_off")}
        title={micOn ? t("party.control.mic_on") : t("party.control.mic_off")}
        data-sf-party-mic={micOn ? "on" : "off"}
        className={cn(
          ROUND,
          micOn
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
      >
        {micOn ? (
          <Mic className="size-4" aria-hidden="true" />
        ) : (
          <MicOff className="size-4" aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t("party.control.menu")}
        title={t("party.control.menu")}
        data-sf-party-menu
        className={cn(ROUND, "bg-muted/60 text-muted-foreground hover:bg-muted")}
      >
        <EllipsisVertical className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
