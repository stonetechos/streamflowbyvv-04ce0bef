/**
 * Watch party HUD — Watch Party Engine v2.0.
 *
 * While everyone is watching in their own player, StreamFlow reduces itself to
 * a single floating strip: who is hosting, how long the room has been going,
 * who is talking, and the four things a person might actually want mid-film.
 *
 * It controls nothing outside StreamFlow. Reactions are ours, voice is ours,
 * the elapsed clock is ours; the player belongs to the provider and the person
 * holding the remote (ADR-014).
 */
import { useState } from "react";

import type { VoiceSessionModel } from "@/features/voice";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import { WATCH_PARTY_REACTIONS } from "./reaction-burst";

export interface WatchPartyHudProps {
  readonly hostLabel: string | null;
  readonly elapsedLabel: string;
  readonly voice: VoiceSessionModel;
  readonly onReact: (emoji: string) => void;
  readonly onCatchUp: () => void;
  readonly onLeave: () => void;
  readonly isLeaving: boolean;
}

export function WatchPartyHud({
  hostLabel,
  elapsedLabel,
  voice,
  onReact,
  onCatchUp,
  onLeave,
  isLeaving,
}: WatchPartyHudProps) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);

  const speaker = voice.members.find((member) => member.isSpeaking) ?? null;

  if (hidden) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setHidden(false)}
          className="rounded-full border border-border/70 bg-background/80 px-4 py-2 text-xs font-medium backdrop-blur-xl shadow-e2"
        >
          {t("watch_party.hud.show")}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-border/70 bg-background/80 p-3 shadow-e3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {hostLabel
                ? t("watch_party.hud.hosted_by", { host: hostLabel })
                : t("watch_party.hud.together")}
            </p>
            <p className="mt-0.5 flex items-center gap-2">
              <span className="font-mono text-lg font-semibold tabular-nums">{elapsedLabel}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  voice.isConnected
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 rounded-full",
                    voice.isConnected ? "bg-success" : "bg-muted-foreground",
                  )}
                />
                {speaker
                  ? t("watch_party.hud.speaking", { name: speaker.displayName })
                  : voice.isConnected
                    ? t("watch_party.hud.voice_on")
                    : t("watch_party.hud.voice_off")}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <HudButton
              label={voice.isMuted ? t("watch_party.hud.unmute") : t("watch_party.hud.mute")}
              onClick={() => (voice.isConnected ? voice.toggleMute() : voice.join())}
              active={voice.isConnected && !voice.isMuted}
            >
              {voice.isMuted || !voice.isConnected ? "🔇" : "🎙️"}
            </HudButton>
            <HudButton
              label={t("watch_party.hud.react")}
              onClick={() => setReactionsOpen((open) => !open)}
              active={reactionsOpen}
            >
              ❤️
            </HudButton>
            <HudButton label={t("watch_party.hud.catch_up")} onClick={onCatchUp}>
              ⏱️
            </HudButton>
            <HudButton label={t("watch_party.hud.hide")} onClick={() => setHidden(true)}>
              ⌄
            </HudButton>
            <button
              type="button"
              onClick={onLeave}
              disabled={isLeaving}
              className="ml-1 min-h-11 rounded-full bg-destructive/90 px-3 text-xs font-semibold text-destructive-foreground disabled:opacity-55"
            >
              {t("watch_party.hud.leave")}
            </button>
          </div>
        </div>

        {reactionsOpen ? (
          <div className="mt-2 flex items-center justify-center gap-2 border-t border-border/60 pt-2">
            {WATCH_PARTY_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={emoji}
                onClick={() => onReact(emoji)}
                className="min-h-11 rounded-full px-3 text-2xl transition-transform duration-fast hover:scale-110 active:scale-95 motion-reduce:transform-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HudButton({
  label,
  onClick,
  active = false,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly active?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-11 place-items-center rounded-full border text-base transition-colors duration-fast",
        active ? "border-primary/40 bg-primary/15" : "border-border/60 bg-surface/60 hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
