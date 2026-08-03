/**
 * Voice dock — UX Simplification Pass.
 *
 * The call, pinned to the bottom of the room: microphone, speaker, leave.
 * Nothing else. It renders the transport's state and forwards intent; it
 * decides nothing about the room.
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
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
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
        "grid size-12 place-items-center rounded-full border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        danger
          ? "border-destructive/40 bg-destructive/12 text-destructive hover:bg-destructive/20"
          : active
            ? "border-transparent bg-primary text-primary-foreground"
            : "border-border bg-surface/80 text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export function VoiceDock({ voice, onLeaveRoom, isLeaving = false }: VoiceDockProps) {
  const { t } = useTranslation();

  const connected = voice.isConnected;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border/70 bg-surface/90 px-3 py-2 shadow-e3 backdrop-blur-xl">
        <DockButton
          label={voice.isMuted ? t("voice.action.unmute") : t("voice.action.mute")}
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

        <span aria-hidden="true" className="h-6 w-px bg-border" />

        <DockButton danger label={t("room.actions.leave")} onClick={onLeaveRoom}>
          {isLeaving ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
