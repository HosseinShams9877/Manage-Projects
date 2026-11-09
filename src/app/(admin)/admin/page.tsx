"use client";

/**
 * /admin — admin dashboard (Phase 6 §1).
 * Client component on purpose: the spec requires the dashboard module's
 * `useAdminDashboard` hook, and with it come proper loading (skeleton grid)
 * and error (inline retry) states. All money/numbers/dates render through
 * the core formatters — RIAL strings on the wire, Toman on screen.
 */

import { RefreshCw } from "lucide-react";
import { Card } from "@/core/components/Card";
import { ErrorState } from "@/core/components/ErrorState";
import { CardSkeletonGrid, ListSkeleton } from "@/core/components/Skeleton";
import { useAdminDashboard } from "@/modules/dashboard/hooks";
import { ActivityFeed } from "@/modules/dashboard/components/ActivityFeed";
import { ProjectHealthCard } from "@/modules/dashboard/components/ProjectHealthCard";
import { SummaryCards } from "@/modules/dashboard/components/SummaryCards";
import { TopEmployeesCard } from "@/modules/dashboard/components/TopEmployeesCard";

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">داشبورد</h2>
          <p className="text-sm text-foreground-muted mt-1">
            خلاصه وضعیت پروژه‌ها و پرداخت‌ها.
          </p>
        </div>
        <CardSkeletonGrid count={8} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><Card title="فعالیت‌های اخیر"><ListSkeleton rows={5} /></Card></div>
          <div className="flex flex-col gap-4">
            <Card title="وضعیت پروژه‌ها"><ListSkeleton rows={3} /></Card>
            <Card title="کارمندان برتر"><ListSkeleton rows={3} /></Card>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">داشبورد</h2>
          <p className="text-sm text-foreground-muted mt-1">خلاصه وضعیت پروژه‌ها و پرداخت‌ها.</p>
        </div>
        <Card>
          <ErrorState
            title="بارگذاری داشبورد ناموفق بود"
            message={error?.message}
            onRetry={() => refetch()}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">داشبورد</h2>
          <p className="text-sm text-foreground-muted mt-1">
            خلاصه وضعیت پروژه‌ها و پرداخت‌ها.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-muted hover:bg-surface-2 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} aria-hidden />
          به‌روزرسانی
        </button>
      </div>

      <SummaryCards stats={data} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityFeed items={data.recentActivity} />
        </div>
        <div className="flex flex-col gap-4">
          <ProjectHealthCard health={data.projectHealth} />
          <TopEmployeesCard employees={data.topEmployees} />
        </div>
      </div>
    </div>
  );
}
