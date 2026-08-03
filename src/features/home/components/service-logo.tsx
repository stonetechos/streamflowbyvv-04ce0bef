/**
 * Service logos — Sprint I.1.
 *
 * Presentation only. Monochrome, vector brand marks drawn in `currentColor`
 * so every tile scales and themes identically. These are approved
 * placeholders: swapping in licensed artwork later means changing only the
 * `MARKS` table below — the component API (`brandKey` + `name`) does not move.
 */
import { cn } from "@/lib/utils";

export interface ServiceLogoProps {
  readonly brandKey: string;
  readonly name: string;
  readonly className?: string;
}

/** Shared canvas so every mark occupies the same optical box. */
const VIEW_BOX = "0 0 240 72";

interface WordmarkStyle {
  /** Rendered text; defaults to the brand name. */
  readonly text?: string;
  readonly weight?: number;
  /** Letter spacing in user units. */
  readonly tracking?: number;
  readonly italic?: boolean;
  readonly uppercase?: boolean;
  /** Optional glyph drawn to the left of the wordmark. */
  readonly glyph?: "play" | "plus" | "dot" | "leaf" | "triangle" | "file";
}

const MARKS: Record<string, WordmarkStyle> = {
  netflix: { uppercase: true, weight: 800, tracking: 3 },
  prime_video: { text: "prime video", weight: 700, tracking: 0.5 },
  disney_hotstar: { text: "Disney", weight: 700, glyph: "plus" },
  jiohotstar: { text: "JioHotstar", weight: 700 },
  sonyliv: { text: "SonyLIV", uppercase: true, weight: 800, tracking: 1 },
  apple_tv_plus: { text: "tv", weight: 700, tracking: 1, glyph: "plus" },
  youtube: { text: "YouTube", weight: 800, glyph: "play" },
  crunchyroll: { text: "crunchyroll", weight: 700, glyph: "leaf" },
  hbo_max: { text: "HBO Max", uppercase: true, weight: 800, tracking: 1 },
  hulu: { text: "hulu", weight: 800, tracking: -1 },
  zee5: { text: "ZEE5", uppercase: true, weight: 800, tracking: 2 },
  peacock: { text: "peacock", weight: 700, glyph: "dot" },
  paramount_plus: { text: "Paramount", weight: 700, glyph: "triangle" },
  tubi: { text: "tubi", weight: 800, italic: true, tracking: -1 },
  pluto_tv: { text: "pluto", weight: 700, glyph: "play" },
  google_drive: { text: "Drive", weight: 600, glyph: "triangle" },
  local_file: { text: "My file", weight: 600, glyph: "file" },
};

function Glyph({ kind }: { kind: NonNullable<WordmarkStyle["glyph"]> }) {
  switch (kind) {
    case "play":
      return (
        <g>
          <rect x="4" y="16" width="52" height="40" rx="12" fill="currentColor" opacity="0.9" />
          <path d="M25 28.5 41 36 25 43.5Z" fill="var(--color-card)" />
        </g>
      );
    case "plus":
      return (
        <path
          d="M30 20v32M14 36h32"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />
      );
    case "dot":
      return <circle cx="30" cy="36" r="17" fill="currentColor" opacity="0.9" />;
    case "leaf":
      return (
        <path
          d="M47 20c-22-6-36 4-36 16s14 22 36 16c-13-6-19-11-19-16s6-10 19-16Z"
          fill="currentColor"
        />
      );
    case "triangle":
      return <path d="M30 17 49 55H11Z" fill="currentColor" opacity="0.9" />;
    case "file":
      return (
        <path
          d="M14 16h20l12 12v28a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4Z"
          fill="currentColor"
          opacity="0.9"
        />
      );
  }
}

/**
 * A single brand mark. Renders as decorative artwork; the accessible name is
 * carried by the card's own text, so the SVG stays `aria-hidden`.
 */
export function ServiceLogo({ brandKey, name, className }: ServiceLogoProps) {
  const style = MARKS[brandKey] ?? { weight: 700 };
  const raw = style.text ?? name;
  const label = style.uppercase ? raw.toUpperCase() : raw;
  const hasGlyph = Boolean(style.glyph);
  // Keeps long names inside the same optical box as short ones.
  const available = hasGlyph ? 168 : 216;
  const fontSize = Math.min(38, Math.round((available / Math.max(label.length, 1)) * 1.75));

  return (
    <svg
      viewBox={VIEW_BOX}
      role="presentation"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      className={cn("h-full w-full", className)}
    >
      {style.glyph ? <Glyph kind={style.glyph} /> : null}
      <text
        x={hasGlyph ? 62 : 120}
        y="36"
        textAnchor={hasGlyph ? "start" : "middle"}
        dominantBaseline="central"
        fill="currentColor"
        fontFamily="var(--font-display, inherit)"
        fontSize={fontSize}
        fontWeight={style.weight ?? 700}
        fontStyle={style.italic ? "italic" : "normal"}
        letterSpacing={style.tracking ?? 0}
      >
        {label}
      </text>
    </svg>
  );
}
