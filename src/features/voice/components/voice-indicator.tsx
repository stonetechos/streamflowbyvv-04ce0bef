/**
 * Voice indicator — Milestone G.
 *
 * The per-member voice glyph used by the roster: on the call, speaking, muted,
 * or not present. Decoration with a label, never a control.
 */
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export type VoiceIndicatorState = "absent" | "listening" | "speaking" | "muted";

export interface VoiceIndicatorProps {
  readonly state: VoiceIndicatorState;
  readonly className?: string;
}

const LABEL_KEYS: Readonly<Record<VoiceIndicatorState, string>> = {
  absent: "voice.member.absent",
  listening: "voice.member.listening",
  speaking: "voice.member.speaking",
  muted: "voice.member.muted",
};

export function VoiceIndicator({ state, className }: VoiceIndicatorProps) {
  const { t } = useTranslation();
  const label = t(LABEL_KEYS[state]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
        state === "speaking"
          ? "sf-voice-speaking bg-primary/12 text-primary"
          : state === "muted"
            ? "bg-warning/12 text-warning"
            : state === "listening"
              ? "bg-success/12 text-success"
              : "text-muted-foreground",
        className,
      )}
      title={label}
    >
      <span aria-hidden="true">
        {state === "muted" ? "\u{1F507}" : state === "absent" ? "\u00b7" : "\u{1F3A4}"}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
