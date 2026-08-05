/**
 * Section header and empty state — Milestone E.
 *
 * Every rail on the home screen is introduced the same way, and every rail
 * that has nothing to show says so in the same voice: what this space is for,
 * and the one action that fills it.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly className?: string;
  /** Heading level, so the page keeps a single H1 and a sane outline. */
  readonly as?: "h2" | "h3";
}

export function SectionHeader({
  title,
  description,
  action,
  className,
  as: Heading = "h2",
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <Heading className="font-display text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </Heading>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
  readonly illustration?: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
}

export function EmptyState({
  title,
  description,
  illustration,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-2xl bg-muted/40 px-5 py-6 text-left",
        className,
      )}
    >
      {illustration ? <div className="mb-1">{illustration}</div> : null}
      <p className="font-display text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

