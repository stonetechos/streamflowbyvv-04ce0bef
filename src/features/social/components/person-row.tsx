/**
 * Person row — Milestone F.0.
 *
 * The single way a person appears in a list anywhere in StreamFlow: avatar,
 * name, handle or profile code, an optional line of context, and whatever
 * actions the caller supplies. Consistency here is what makes the friends
 * list, the search results and the recent-partners rail feel like one product.
 */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Avatar, presetForName, type AvatarPreset } from "@/design-system/components";
import { AVATAR_PRESETS } from "@/design-system/components";
import { cn } from "@/lib/utils";

export interface PersonRowProps {
  readonly profileId: string;
  readonly displayName: string;
  readonly handle?: string;
  readonly code?: string;
  readonly avatarPreset?: string | null;
  /** A short line of context: "watched together on…", "requested 2 days ago". */
  readonly meta?: string;
  readonly actions?: ReactNode;
  readonly className?: string;
}

function toPreset(value: string | null | undefined, name: string): AvatarPreset {
  return (AVATAR_PRESETS as readonly string[]).includes(value ?? "")
    ? (value as AvatarPreset)
    : presetForName(name);
}

export function PersonRow({
  profileId,
  displayName,
  handle,
  code,
  avatarPreset,
  meta,
  actions,
  className,
}: PersonRowProps) {
  const secondary = handle ? `@${handle}` : code;

  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4", className)}>
      <Link
        to="/people/$profileId"
        params={{ profileId }}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar name={displayName} preset={toPreset(avatarPreset, displayName)} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{displayName}</span>
          {secondary ? (
            <span className="block truncate text-xs text-muted-foreground">{secondary}</span>
          ) : null}
          {meta ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{meta}</span> : null}
        </span>
      </Link>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
