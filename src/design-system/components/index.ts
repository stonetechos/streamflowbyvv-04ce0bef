/**
 * Presentation primitives — Milestone E.
 *
 * These are pure presentation: they hold no state a service owns, take no
 * decision a domain rule owns, and never import a feature. Screens compose
 * them; nothing composes screens.
 */
export {
  ActionButton,
  type ActionButtonProps,
  type ActionSize,
  type ActionTone,
} from "./action-button";
export {
  Avatar,
  AVATAR_PRESETS,
  presetForName,
  type AvatarPreset,
  type AvatarProps,
} from "./avatar";

export { EmptyState, SectionHeader, type EmptyStateProps, type SectionHeaderProps } from "./section";
export { Skeleton, SkeletonCard, SkeletonRail } from "./skeleton";
export {
  Surface,
  type SurfacePadding,
  type SurfaceProps,
  type SurfaceTone,
} from "./surface";
export { TextField, type TextFieldProps } from "./text-field";
