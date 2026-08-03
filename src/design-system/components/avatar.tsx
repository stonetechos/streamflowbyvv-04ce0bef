/**
 * Avatar — Milestone E.
 *
 * StreamFlow does not upload photographs in v1, so an avatar is a generated
 * mark: the person's initials over one of six token-derived gradients. The
 * chosen preset is a small string stored with the profile, which keeps the
 * feature free of storage, moderation and privacy obligations we are not ready
 * to meet (MVP non-goals).
 */
import { cn } from "@/lib/utils";

export const AVATAR_PRESETS = ["aurora", "dusk", "ember", "forest", "lagoon", "orchid"] as const;
export type AvatarPreset = (typeof AVATAR_PRESETS)[number];

const PRESET_CLASS: Record<AvatarPreset, string> = {
  aurora: "bg-gradient-to-br from-primary to-info text-primary-foreground",
  dusk: "bg-gradient-to-br from-info to-primary text-primary-foreground",
  ember: "bg-gradient-to-br from-warning to-destructive text-warning-foreground",
  forest: "bg-gradient-to-br from-success to-info text-success-foreground",
  lagoon: "bg-gradient-to-br from-info to-success text-info-foreground",
  orchid: "bg-gradient-to-br from-primary to-destructive text-primary-foreground",
};

const SIZE = {
  sm: "size-9 text-xs",
  md: "size-12 text-sm",
  lg: "size-20 text-xl",
};

export interface AvatarProps {
  readonly name: string;
  readonly preset?: AvatarPreset;
  readonly size?: keyof typeof SIZE;
  readonly className?: string;
}

/** Derives a stable preset from a name so an unset avatar still looks chosen. */
export function presetForName(name: string): AvatarPreset {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return AVATAR_PRESETS[hash % AVATAR_PRESETS.length] as AvatarPreset;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] as string).slice(0, 2).toUpperCase();
  return `${(parts[0] as string)[0] ?? ""}${(parts[1] as string)[0] ?? ""}`.toUpperCase();
}

export function Avatar({ name, preset, size = "md", className }: AvatarProps) {
  const resolved = preset ?? presetForName(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide",
        PRESET_CLASS[resolved],
        SIZE[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
