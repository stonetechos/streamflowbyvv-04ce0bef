/**
 * Responsive breakpoints — Sprint 1.0 §3.
 *
 * Mirrors the `--breakpoint-*` tokens in `src/styles.css`. Kept in TypeScript
 * only so non-CSS consumers (e.g. a media-query hook) never invent a second
 * set of values. CSS remains the source of truth for layout.
 */

export const BREAKPOINTS = Object.freeze({
  xs: 384,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
});

export type BreakpointName = keyof typeof BREAKPOINTS;

export function minWidthQuery(name: BreakpointName): string {
  return `(min-width: ${BREAKPOINTS[name]}px)`;
}
