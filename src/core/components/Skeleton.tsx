/**
 * Skeleton — neutral loading placeholder (Phase 6 §3a).
 * Uses `animate-pulse` on token colors only (bg-muted / bg-surface-2), so it
 * follows light/dark themes with no hardcoded color anywhere.
 */

interface SkeletonProps {
  className?: string;
}

/** A single pulsing bar. Default: one line of body text. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} aria-hidden />;
}

/** A card-sized loading block: title bar + a few value lines. */
export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm p-4 flex flex-col gap-3">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Grid of card skeletons for dashboard-style pages. */
export function CardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** A few list-row placeholders (activity feeds, tables while loading). */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
