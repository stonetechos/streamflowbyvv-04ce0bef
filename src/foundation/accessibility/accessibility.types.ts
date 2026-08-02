/**
 * Accessibility contracts — Sprint 1.0 §7.
 *
 * Field ownership follows ADR-005: reduced motion, high contrast and font scale
 * are `accessibility_preferences` values. Sprint 1.0 holds them in memory only;
 * persistence arrives with the Settings module.
 */

export const CONTRAST_MODES = ["default", "high"] as const;
export type ContrastMode = (typeof CONTRAST_MODES)[number];

/** Mirrors `accessibility_mode` in the Database Specification §5. */
export const ACCESSIBILITY_MODES = [
  "default",
  "reduced_motion",
  "high_contrast",
  "screen_reader_optimized",
] as const;
export type AccessibilityMode = (typeof ACCESSIBILITY_MODES)[number];

export const FONT_SCALE_RANGE = Object.freeze({ MIN: 0.875, MAX: 1.5, STEP: 0.125 });

export interface AccessibilityPreferences {
  /** `null` means "follow the operating system". */
  readonly reducedMotion: boolean | null;
  readonly contrast: ContrastMode;
  readonly fontScale: number;
}

export type AriaLivePoliteness = "polite" | "assertive";
