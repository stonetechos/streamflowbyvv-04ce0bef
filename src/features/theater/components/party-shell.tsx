/**
 * Party shell — the theatre takeover frame.
 *
 * The room becomes the whole screen: a dark, chrome-light surface where the
 * stage is the only thing with weight. Everything else floats at the edges —
 * a call-style control cluster top left, the people rail beneath it, a
 * persistent party message bar along the bottom. Panels open over the stage
 * instead of pushing it around.
 *
 * This component is presentation only. It never decides room state.
 */
import type { ReactNode } from "react";

export interface PartyShellProps {
  /** Call-style cluster: leave, microphone, extras. */
  readonly controls: ReactNode;
  /** The room's subject, kept small in the top bar. */
  readonly title: ReactNode;
  /** Participant avatars plus the invite affordance. */
  readonly rail: ReactNode;
  /** Right-hand utilities: sync verdict, people count. */
  readonly utilities: ReactNode;
  /** The stage itself — the only element that owns the middle. */
  readonly stage: ReactNode;
  /** Sheets, dialogs and drawers that float above the stage. */
  readonly overlay?: ReactNode;
  /** Persistent bottom composer. */
  readonly messageBar: ReactNode;
  readonly phase: string;
  readonly regionLabel: string;
}

export function PartyShell({
  controls,
  title,
  rail,
  utilities,
  stage,
  overlay,
  messageBar,
  phase,
  regionLabel,
}: PartyShellProps) {
  return (
    <section
      aria-label={regionLabel}
      data-sf-phase={phase}
      data-sf-party-shell
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground"
    >
      <div className="flex items-center justify-between gap-3 px-3 pt-3 sm:px-4 sm:pt-4">
        {controls}
        <div className="min-w-0 flex-1 text-center max-sm:hidden">{title}</div>
        <div className="flex shrink-0 items-center gap-1.5">{utilities}</div>
      </div>

      <div className="px-3 pb-1 pt-2 sm:px-4">{rail}</div>


      <div className="relative min-h-0 flex-1 overflow-hidden border-y border-border/40">
        <div className="absolute inset-0 overflow-y-auto overscroll-contain">{stage}</div>
        {overlay}
      </div>

      {messageBar}
    </section>
  );
}
