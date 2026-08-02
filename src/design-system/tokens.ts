/**
 * Design system token references — Sprint 1.0 §3.
 *
 * These are NAMES of CSS custom properties, not values. Values live in
 * `src/styles.css` so a theme change never requires a TypeScript rebuild and a
 * token is never defined twice.
 */

export const ELEVATION_TOKENS = ["e0", "e1", "e2", "e3", "e4"] as const;
export type ElevationLevel = (typeof ELEVATION_TOKENS)[number];

export const elevation = (level: ElevationLevel): string => `var(--shadow-${level})`;

export const SPACING_TOKENS = Object.freeze({
  insetXs: "var(--space-inset-xs)",
  insetSm: "var(--space-inset-sm)",
  insetMd: "var(--space-inset-md)",
  insetLg: "var(--space-inset-lg)",
  insetXl: "var(--space-inset-xl)",
  stackSm: "var(--space-stack-sm)",
  stackMd: "var(--space-stack-md)",
  stackLg: "var(--space-stack-lg)",
  section: "var(--space-section)",
});

export const MOTION_TOKENS = Object.freeze({
  instant: "var(--duration-instant)",
  fast: "var(--duration-fast)",
  normal: "var(--duration-normal)",
  slow: "var(--duration-slow)",
  easeStandard: "var(--ease-standard)",
  easeEmphasized: "var(--ease-emphasized)",
});

export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
