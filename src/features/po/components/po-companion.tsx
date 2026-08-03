/**
 * Po — the Vedora Vision companion illustration (Sprint 2.1).
 *
 * Original artwork: a calm, minimal, futuristic panda drawn from primitives
 * (circles, rounded rectangles, arcs). It is deliberately not modelled on any
 * existing character — proportions, palette, and the tree motif are our own.
 *
 * Po is visual only. It has no state machine, no speech, no intelligence, and
 * consumes no service. Every animation is CSS on top of static SVG, so the
 * component stays cheap on mobile and inert under reduced motion (the global
 * rule in `styles.css` neutralises these keyframes automatically).
 *
 * The API is intentionally narrow — `mood` and `gazeToken` — so richer
 * animation can be added later without a signature change (Build Rules §2).
 */
import { cn } from "@/lib/utils";

/**
 * Sprint 2.2 moods. Po is still decorative: a mood only selects an idle
 * animation and a mouth curve — it never implies speech, planning, or an
 * opinion about what the room chose (Po Rule).
 *
 * - `calm` — waiting in the lobby
 * - `thinking` — a host action is in flight
 * - `delighted` — everyone is ready
 * - `focused` — a provider has been chosen
 *
 * Sprint 2.3 adds three countdown moods. They still only pick an animation
 * cadence and a mouth curve — Po does not speak, plan, or know what a
 * countdown is for (Po Rule).
 *
 * - `counting` — a countdown is running
 * - `celebrating` — the countdown reached zero
 * - `disappointed` — the countdown was cancelled; brief, then back to calm
 *
 * Sprint 2.4 adds one more: `excited`, for the moment the room becomes ready
 * to watch. Po smiles and stands up. Still decorative — Po does not know what
 * playback is, cannot start it, and says nothing (Po Rule).
 */
export type PoMood =
  | "calm"
  | "thinking"
  | "delighted"
  | "focused"
  | "counting"
  | "celebrating"
  | "disappointed"
  | "excited"
  // Sprint 2.5 — Po quietly watches the clocks settle. Watching only: Po
  // measures nothing, reports nothing, and still says nothing (Po Rule).
  | "observing"
  // Sprint 2.6 — the room's own synchronization. `concerned` is a calm
  // gesture that someone is still catching up; `relieved` is the breath out
  // when everyone is back in step. Decorative, as always (Po Rule).
  | "concerned"
  | "relieved"
  // Sprint 2.7 — playback synchronization. `encouraging` is a calm, patient
  // gesture while the room is asked to re-sync; the existing `celebrating`
  // mood is reused, quietly, when everyone becomes synchronization ready.
  | "encouraging"
  // Sprint 2.9 — the confirmation workflow. `waiting` is Po settling in while
  // people are still arriving; `happy` is the small lift when one more person
  // confirms. Everyone-ready reuses `celebrating`. Visual only (Po Rule).
  | "waiting"
  | "happy";

export interface PoCompanionProps {
  readonly mood?: PoMood;
  /**
   * Changing this value makes Po glance toward the roster, as if noticing an
   * arrival. Any stable string works; the value itself is never rendered.
   */
  readonly gazeToken?: string | null;
  readonly className?: string;
}

export function PoCompanion({ mood = "calm", gazeToken = null, className }: PoCompanionProps) {
  return (
    <svg
      key={gazeToken ?? "idle"}
      viewBox="0 0 160 120"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      className={cn("sf-po h-24 w-32 shrink-0 select-none", className)}
      data-mood={mood}
    >
      {/* Tree — a slim trunk and a soft canopy that drifts. */}
      <g className="sf-po-tree">
        <path
          d="M118 96 L118 60 Q118 54 124 52"
          stroke="var(--color-muted-foreground)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        <g className="sf-po-canopy">
          <circle cx="126" cy="42" r="18" fill="var(--color-primary)" opacity="0.16" />
          <circle cx="110" cy="48" r="12" fill="var(--color-primary)" opacity="0.12" />
          <circle cx="138" cy="52" r="10" fill="var(--color-primary)" opacity="0.1" />
        </g>
      </g>

      {/* Ground line. */}
      <path
        d="M14 97 H150"
        stroke="var(--color-border)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Po. The whole body breathes as one. */}
      <g className="sf-po-body">
        {/* Tail, low and slow. */}
        <circle className="sf-po-tail" cx="46" cy="88" r="6" fill="var(--color-foreground)" />

        {/* Seated body. */}
        <path
          d="M56 96 Q52 66 80 66 Q108 66 104 96 Z"
          fill="var(--color-card)"
          stroke="var(--color-foreground)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Arms resting. */}
        <path
          d="M60 82 Q66 94 76 95"
          stroke="var(--color-foreground)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M100 82 Q94 94 84 95"
          stroke="var(--color-foreground)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Ears — independent, tiny movement. */}
        <circle
          className="sf-po-ear sf-po-ear-left"
          cx="61"
          cy="42"
          r="9"
          fill="var(--color-foreground)"
        />
        <circle
          className="sf-po-ear sf-po-ear-right"
          cx="99"
          cy="42"
          r="9"
          fill="var(--color-foreground)"
        />

        {/* Head. */}
        <g className="sf-po-head">
          <circle
            cx="80"
            cy="50"
            r="24"
            fill="var(--color-card)"
            stroke="var(--color-foreground)"
            strokeWidth="2.5"
          />
          {/* Angled eye patches — our own geometry, not a rounded mask. */}
          <path d="M64 46 q7 -8 13 -1 q-4 10 -13 6 Z" fill="var(--color-foreground)" />
          <path d="M96 46 q-7 -8 -13 -1 q4 10 13 6 Z" fill="var(--color-foreground)" />
          <g className="sf-po-eyes">
            <circle cx="71" cy="48" r="2.4" fill="var(--color-card)" />
            <circle cx="89" cy="48" r="2.4" fill="var(--color-card)" />
          </g>
          {/* Muzzle. */}
          <circle cx="80" cy="59" r="2.2" fill="var(--color-foreground)" />
          <path
            className="sf-po-smile"
            d={
              mood === "delighted" ||
              mood === "celebrating" ||
              mood === "excited" ||
              mood === "happy"
                ? "M74 63 q6 7 12 0"
                : mood === "disappointed"
                  ? "M75 65 q5 -4 10 0"
                  : mood === "thinking" || mood === "counting"
                    ? "M75 64 q5 -2 10 0"
                    : mood === "waiting"
                      ? "M75 63 q5 3 10 0"
                    : "M75 63 q5 4 10 0"
            }
            stroke="var(--color-foreground)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* A single soft accent — the Vedora Vision signature mark. */}
          <circle cx="80" cy="30" r="2" fill="var(--color-primary)" opacity="0.9" />
        </g>
      </g>
    </svg>
  );
}
