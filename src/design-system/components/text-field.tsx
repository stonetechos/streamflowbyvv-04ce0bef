/**
 * Text field — Milestone E.
 *
 * A labelled input with description and error wiring done once, correctly:
 * every field has a real `<label>`, errors are announced, and `aria-invalid`
 * plus `aria-describedby` are always in agreement (WCAG 3.3.1, 3.3.2).
 */
import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  readonly label: string;
  readonly description?: ReactNode;
  readonly error?: string | null;
  readonly trailing?: ReactNode;
}

export function TextField({
  label,
  description,
  error = null,
  trailing,
  className,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  const describedBy =
    [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "min-h-12 w-full rounded-xl border bg-background px-4 text-base sm:text-sm",
            "placeholder:text-muted-foreground/70",
            "transition-colors duration-fast ease-standard",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:opacity-55",
            error ? "border-destructive" : "border-input",
            trailing ? "pr-12" : "",
            className,
          )}
          {...rest}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-2 flex items-center">{trailing}</span>
        ) : null}
      </div>

      {description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
