/**
 * Notification badge — RC2 Blocker 2.
 *
 * A small, honest count. Nine or more reads as "9+", zero renders nothing, and
 * the number is announced to assistive technology with its meaning attached.
 */
import { cn } from "@/lib/utils";

export interface NotificationBadgeProps {
  readonly count: number;
  readonly label: string;
  readonly className?: string;
}

export function NotificationBadge({ count, label, className }: NotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "pointer-events-none inline-flex min-w-[1.125rem] items-center justify-center rounded-full",
        "bg-primary px-1 text-[0.625rem] font-semibold leading-4 text-primary-foreground shadow-e1",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
