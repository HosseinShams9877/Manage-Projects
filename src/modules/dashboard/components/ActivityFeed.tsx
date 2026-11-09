/**
 * Admin dashboard activity feed (Phase 6 §1) — the last merged events
 * (employer payments, employee payments, collected installments) as a
 * timeline with type badges and relative Jalali timestamps.
 */

import { Activity } from "lucide-react";
import { Card } from "@/core/components/Card";
import { Badge, type BadgeTone } from "@/core/components/Badge";
import { EmptyState } from "@/core/components/EmptyState";
import { formatToman } from "@/core/lib/format";
import type { DashboardActivityDTO, DashboardActivityType } from "../lib/schema";

interface ActivityFeedProps {
  items: DashboardActivityDTO[];
}

const TYPE_TONE: Record<DashboardActivityType, BadgeTone> = {
  EMPLOYER_PAYMENT: "success",
  EMPLOYEE_PAYMENT: "info",
  INSTALLMENT: "warning",
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card title="فعالیت‌های اخیر" description="جدیدترین رویدادهای مالی سامانه.">
      {items.length === 0 ? (
        <EmptyState message="فعالیتی ثبت نشده است." hint="پرداخت‌های جدید اینجا نمایش داده می‌شوند." />
      ) : (
        <ol className="flex flex-col">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={`flex items-start gap-3 py-3 ${
                index === items.length - 1 ? "pb-0" : "border-b border-border"
              }`}
            >
              {/* Timeline spine */}
              <span className="flex flex-col items-center self-stretch shrink-0">
                <span className="mt-1 w-2.5 h-2.5 rounded-full bg-brand-500" aria-hidden />
                {index < items.length - 1 ? (
                  <span className="flex-1 w-px bg-border mt-1.5" aria-hidden />
                ) : null}
              </span>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={TYPE_TONE[item.type]}>{item.description}</Badge>
                  <span className="text-xs text-foreground-subtle tabular-nums shrink-0">
                    {item.relativeTime}
                  </span>
                </div>
                <p className="text-sm text-foreground truncate">
                  {item.projectTitle}
                  {item.actorName ? ` — ${item.actorName}` : ""}
                </p>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-foreground-subtle tabular-nums">{item.jalaliDate}</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {formatToman(item.amount)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-foreground-subtle">
        <Activity className="w-3.5 h-3.5" aria-hidden />
        <span>۱۰ رویداد اخیر</span>
      </div>
    </Card>
  );
}
