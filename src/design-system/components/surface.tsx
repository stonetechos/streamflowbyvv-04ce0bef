/**
 * Surfaces — Milestone E consumer experience.
 *
 * Three ways to raise content off the background, expressed once so every
 * screen agrees: a plain `card`, a translucent `glass` panel for content that
 * floats over imagery or gradient, and `bare` for grouping without chrome.
 *
 * Every value is a semantic token. No colour literal appears here.
 */
import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SurfaceTone = "card" | "glass" | "bare";
export type SurfacePadding = "none" | "sm" | "md" | "lg";

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  readonly as?: ElementType;
  readonly tone?: SurfaceTone;
  readonly padding?: SurfacePadding;
  /** Adds a hover lift. Only for surfaces that are themselves interactive. */
  readonly interactive?: boolean;
  readonly children?: ReactNode;
}

const TONE: Record<SurfaceTone, string> = {
  card: "bg-card text-card-foreground border border-border shadow-e1",
  glass:
    "bg-surface/70 text-surface-foreground border border-border/60 shadow-e2 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/55",
  bare: "bg-transparent",
};

const PADDING: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Surface({
  as: Component = "div",
  tone = "card",
  padding = "md",
  interactive = false,
  className,
  children,
  ...rest
}: SurfaceProps) {
  return (
    <Component
      className={cn(
        "rounded-2xl",
        TONE[tone],
        PADDING[padding],
        interactive &&
          "transition-[transform,box-shadow,background-color] duration-normal ease-standard hover:-translate-y-0.5 hover:shadow-e3 focus-visible:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
