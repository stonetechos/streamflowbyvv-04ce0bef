/**
 * Action button — Milestone E.
 *
 * One button, four intents, three sizes. Minimum target height is 44px at
 * every size (WCAG 2.5.5 / MVP §12), because this application is used on
 * phones one-handed.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ActionTone = "primary" | "secondary" | "ghost" | "destructive";
export type ActionSize = "sm" | "md" | "lg";

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tone?: ActionTone;
  readonly size?: ActionSize;
  readonly loading?: boolean;
  readonly block?: boolean;
  readonly children?: ReactNode;
}

const TONE: Record<ActionTone, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-e1",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

const SIZE: Record<ActionSize, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-5 text-sm",
  lg: "min-h-14 px-6 text-base",
};

export function ActionButton({
  tone = "primary",
  size = "md",
  loading = false,
  block = false,
  className,
  disabled,
  children,
  ...rest
}: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium",
        "transition-colors duration-fast ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-55",
        TONE[tone],
        SIZE[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
        />
      ) : null}
      {children}
    </button>
  );
}
