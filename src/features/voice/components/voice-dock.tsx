/**
 * Voice bar — Beta UX Overhaul.
 *
 * The call controls for the room: microphone, speaker, leave. It used to float
 * over the page and cover whatever was underneath it while scrolling; it is
 * now a fixed bar that sits directly above the bottom navigation, full width,
 * with the page scrolling beneath it and never behind it.
 *
 * It renders the transport's state and forwards intent; it decides nothing
 * about the room.
 */
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { VoiceSessionModel } from "../use-voice-session";

export interface VoiceDockProps {
  readonly voice: VoiceSessionModel;
  readonly onLeaveRoom: () => void;
  readonly isLeaving?: boolean;
}

function DockButton({
  label,
  caption,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  caption: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={danger ? undefined : Boolean(active)}
      onClick={onClick}
      className={cn(
        "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        danger
          ? "text-destructive hover:bg-destructive/12"
          : active
            ? "text-primary hover:bg-accent"
            : "text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
      <span className="text-[0.6875rem] font-medium">{caption}</span>
    </button>
  );
}

export function VoiceDock({ voice, onLeaveRoom, isLeaving = false }: VoiceDockProps) {
  const { t } = useTranslation();

  const connected = voice.isConnected;

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 border-t border-border/70 bg-surface/95 backdrop-blur-xl",
        // Above the bottom navigation on phones, at the screen edge from md up
        // where the bottom bar is not rendered at all.
        "bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] md:bottom-0 md:pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className="mx-auto flex w-full max-w-lg items-stretch gap-1 px-3 py-1.5">
        <DockButton
          label={voice.isMuted ? t("voice.action.unmute") : t("voice.action.mute")}
          caption={voice.isMuted || !connected ? t("voice.short.muted") : t("voice.short.mic")}
          active={connected && !voice.isMuted}
          onClick={() => (connected ? voice.toggleMute() : voice.join())}
        >
          {voice.isMuted || !connected ? (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
              <path
                d="M4 4l16 16M9 5a3 3 0 0 1 6 0v5m-6 1a3 3 0 0 0 5 2M5 11a7 7 0 0 0 10.5 6M19 11a6.9 6.9 0 0 1-.6 2.8M12 19v2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
              <rect
                x="9"
                y="3"
                width="6"
                height="11"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M5 11a7 7 0 0 0 14 0M12 18v3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          )}
        </DockButton>

        <DockButton
          label={voice.isDeafened ? t("voice.action.undeafen") : t("voice.action.deafen")}
          caption={t("voice.short.speaker")}
          active={connected && !voice.isDeafened}
          onClick={() => voice.toggleDeafen()}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
            <path
              d="M4 14V9.5A5.5 5.5 0 0 1 9.5 4h5A5.5 5.5 0 0 1 20 9.5V14M4 14v2.5A1.5 1.5 0 0 0 5.5 18h1A1.5 1.5 0 0 0 8 16.5V14zm16 0v2.5A1.5 1.5 0 0 1 18.5 18h-1A1.5 1.5 0 0 1 16 16.5V14z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {voice.isDeafened ? (
              <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            ) : null}
          </svg>
        </DockButton>

        <DockButton
          danger
          label={t("room.actions.leave")}
          caption={t("voice.short.leave")}
          onClick={onLeaveRoom}
        >
          {isLeaving ? (
            <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
              <path
                d="M15 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8M13 12h8m0 0-3-3m3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </DockButton>
      </div>
    </div>
  );
}
