import { CardSkeletonGrid } from "@/core/components/Skeleton";

/**
 * Global route-segment loading skeleton (Phase 6 §4) — shown by Next while a
 * server component (e.g. /me or /admin) streams in.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 py-6">
        <div className="flex flex-col gap-2">
          <div className="animate-pulse rounded-md bg-muted h-6 w-40" />
          <div className="animate-pulse rounded-md bg-muted h-4 w-72" />
        </div>
        <CardSkeletonGrid count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-lg border border-border bg-surface shadow-sm p-4 flex flex-col gap-3">
            <div className="animate-pulse rounded-md bg-muted h-4 w-32" />
            <div className="animate-pulse rounded-md bg-muted h-3 w-full" />
            <div className="animate-pulse rounded-md bg-muted h-3 w-3/4" />
            <div className="animate-pulse rounded-md bg-muted h-3 w-5/6" />
          </div>
          <div className="rounded-lg border border-border bg-surface shadow-sm p-4 flex flex-col gap-3">
            <div className="animate-pulse rounded-md bg-muted h-4 w-24" />
            <div className="animate-pulse rounded-md bg-muted h-3 w-full" />
            <div className="animate-pulse rounded-md bg-muted h-3 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
