/**
 * Home skeletons — Milestone E.
 *
 * The home screen's own shape, shown while the snapshot loads. Same rails, same
 * rhythm, so nothing jumps when the real content lands.
 */
import { Skeleton, SkeletonCard } from "@/design-system/components";

export function HomeSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-8 w-2/3 max-w-sm" />
        <Skeleton className="mt-3 h-3.5 w-1/2 max-w-xs" />
        <Skeleton className="mt-6 h-12 w-40 rounded-xl" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    </div>
  );
}
