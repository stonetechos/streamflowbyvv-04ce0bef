/**
 * Skeleton loading — Milestone E.
 *
 * A shimmer stands in for content whose shape we already know. It is inert to
 * assistive technology (the surrounding region announces "loading"), and it
 * stops moving under reduced motion.
 */
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block rounded-lg bg-muted/70",
        "animate-pulse motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/** A card-shaped placeholder used by the home and profile screens. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}
    >
      <Skeleton className="h-5 w-1/3" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton
            key={index}
            className={cn("h-3.5", index === lines - 1 ? "w-2/3" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}

/** A horizontal row of tile placeholders, for the provider and room rails. */
export function SkeletonRail({ tiles = 4 }: { tiles?: number }) {
  return (
    <div aria-hidden="true" className="flex gap-3 overflow-hidden">
      {Array.from({ length: tiles }, (_, index) => (
        <Skeleton key={index} className="h-28 w-40 shrink-0 rounded-2xl" />
      ))}
    </div>
  );
}
