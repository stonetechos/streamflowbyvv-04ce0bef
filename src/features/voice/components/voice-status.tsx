/**
 * Voice status — Milestone G.
 *
 * One honest line about the call: connected, reconnecting, or broken, plus a
 * connection-quality band that uses the same vocabulary as sync health so a
 * member only ever learns one set of words.
 */
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import { VOICE_QUALITY_KEYS, VOICE_STATE_KEYS } from "../voice.types";
import type { VoiceSessionModel } from "../use-voice-session";

const QUALITY_BARS: Readonly<Record<string, number>> = {
  excellent: 3,
  good: 2,
  poor: 1,
  unknown: 0,
};

const QUALITY_TONE: Readonly<Record<string, string>> = {
  excellent: "bg-success",
  good: "bg-success/70",
  poor: "bg-warning",
  unknown: "bg-muted-foreground/40",
};

export interface VoiceStatusProps {
  readonly voice: VoiceSessionModel;
  readonly className?: string;
}

export function VoiceStatus({ voice, className }: VoiceStatusProps) {
  const { t } = useTranslation();
  const bars = QUALITY_BARS[voice.quality] ?? 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          voice.state === "connected"
            ? "bg-success"
            : voice.state === "reconnecting" || voice.state === "connecting"
              ? "animate-pulse bg-warning"
              : voice.state === "error"
                ? "bg-destructive"
                : "bg-muted-foreground/40",
        )}
      />
      <span className="text-xs text-muted-foreground">{t(VOICE_STATE_KEYS[voice.state])}</span>

      {voice.isConnected ? (
        <span
          className="ml-1 flex items-end gap-0.5"
          title={t(VOICE_QUALITY_KEYS[voice.quality])}
          aria-label={t(VOICE_QUALITY_KEYS[voice.quality])}
          role="img"
        >
          {[1, 2, 3].map((level) => (
            <span
              key={level}
              aria-hidden="true"
              className={cn(
                "w-1 rounded-full transition-[height,background-color] duration-normal",
                level === 1 ? "h-1.5" : level === 2 ? "h-2.5" : "h-3.5",
                level <= bars ? QUALITY_TONE[voice.quality] : "bg-muted-foreground/25",
              )}
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}
