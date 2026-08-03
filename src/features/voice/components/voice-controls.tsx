/**
 * Voice controls — Milestone G.
 *
 * The whole call, in four large targets: join or leave, mute, deafen, and a
 * recovery affordance when the transport failed. Every control is at least
 * 48px on its short edge (MVP §12) and states its own state out loud.
 */
import { ActionButton } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { VoiceSessionModel } from "../use-voice-session";
import { VoiceStatus } from "./voice-status";

export interface VoiceControlsProps {
  readonly voice: VoiceSessionModel;
  /** Compact drops the labels down to icons for the watch-party bar. */
  readonly compact?: boolean;
  readonly className?: string;
}

export function VoiceControls({ voice, compact = false, className }: VoiceControlsProps) {
  const { t } = useTranslation();

  if (!voice.isAvailable) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>{t("voice.unavailable")}</p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {voice.isConnected || voice.isReconnecting ? (
          <>
            <ToggleControl
              pressed={voice.isMuted}
              onClick={voice.toggleMute}
              busy={voice.pending === "mute"}
              label={voice.isMuted ? t("voice.action.unmute") : t("voice.action.mute")}
              glyph={voice.isMuted ? "\u{1F507}" : "\u{1F3A4}"}
              compact={compact}
              tone={voice.isMuted ? "warning" : "neutral"}
            />
            <ToggleControl
              pressed={voice.isDeafened}
              onClick={voice.toggleDeafen}
              busy={voice.pending === "deafen"}
              label={voice.isDeafened ? t("voice.action.undeafen") : t("voice.action.deafen")}
              glyph={voice.isDeafened ? "\u{1F515}" : "\u{1F3A7}"}
              compact={compact}
              tone={voice.isDeafened ? "warning" : "neutral"}
            />
            <ActionButton tone="ghost" onClick={voice.leave} loading={voice.pending === "leave"}>
              {t("voice.action.leave")}
            </ActionButton>
          </>
        ) : (
          <ActionButton
            onClick={voice.state === "error" ? voice.recover : voice.join}
            loading={voice.pending === "join" || voice.isConnecting}
          >
            {voice.state === "error" ? t("voice.action.reconnect") : t("voice.action.join")}
          </ActionButton>
        )}
      </div>

      <VoiceStatus voice={voice} />

      {voice.error ? (
        <p role="status" className="text-xs text-destructive">
          {t(voice.error.messageKey)}
        </p>
      ) : null}
    </div>
  );
}

function ToggleControl({
  pressed,
  onClick,
  busy,
  label,
  glyph,
  compact,
  tone,
}: {
  pressed: boolean;
  onClick: () => void;
  busy: boolean;
  label: string;
  glyph: string;
  compact: boolean;
  tone: "neutral" | "warning";
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      disabled={busy}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors duration-fast disabled:opacity-60",
        compact ? "min-w-12 justify-center px-3" : "",
        pressed && tone === "warning"
          ? "border-warning/40 bg-warning/12 text-warning"
          : "border-border hover:bg-accent/60",
      )}
    >
      <span aria-hidden="true">{glyph}</span>
      {compact ? null : <span>{label}</span>}
    </button>
  );
}
