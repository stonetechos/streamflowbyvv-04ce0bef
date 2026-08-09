/**
 * Party shell — the theatre takeover frame.
 *
 * The room becomes the whole screen: a charcoal cinema lit by a slow ember
 * wash, where the stage is the only thing with real weight. Everything else
 * is arranged as a bento of quiet tiles beside it — people, room state, the
 * things a person glances at without leaving the film. Panels open over the
 * stage instead of pushing it around.
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
  /** Bento companion tiles: room state, coordination, recovery. */
  readonly aside?: ReactNode;
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
  aside,
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
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="sf-ambient" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,transparent,color-mix(in_oklab,var(--background)_88%,black)_78%)]" />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3 px-3 pt-3 sm:px-5 sm:pt-4">
        {controls}
        <div className="min-w-0 flex-1 text-center max-sm:hidden">{title}</div>
        <div className="flex shrink-0 items-center gap-1.5">{utilities}</div>
      </div>

      <div className="relative z-10 px-3 pb-1 pt-2 sm:px-5">{rail}</div>

      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto overscroll-contain px-3 pb-4 pt-1 sm:px-5">
          <div
            className="mx-auto grid w-full max-w-[110rem] grid-cols-1 items-start gap-3 lg:grid-cols-12 lg:gap-4"
            data-sf-party-bento
          >
            <div className="sf-tile sf-tile-1 min-w-0 lg:col-span-8 xl:col-span-9">{stage}</div>
            {aside ? (
              <div
                className="sf-tile sf-tile-2 flex min-w-0 flex-col gap-3 lg:col-span-4 xl:col-span-3"
                data-sf-party-aside
              >
                {aside}
              </div>
            ) : null}
          </div>
        </div>
        {overlay}
      </div>

      <div className="relative z-10">{messageBar}</div>
    </section>
  );
}
