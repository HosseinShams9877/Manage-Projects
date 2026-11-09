/**
 * Project-health card (Phase 6 §1) — counts by status:
 * active (end date not passed), past end date, and projects carrying
 * overdue installments (not-fully-paid checks whose due date has passed).
 */

import { AlertTriangle, CalendarClock, FolderKanban } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/core/components/Card";
import { toPersianDigits } from "@/core/lib/format";
import type { ProjectHealthDTO } from "../lib/schema";

interface ProjectHealthCardProps {
  health: ProjectHealthDTO;
}

interface Row {
  icon: LucideIcon;
  label: string;
  count: number;
  /** Token-based icon chip + number color. */
  tone: "brand" | "neutral" | "danger";
}

const TONE: Record<Row["tone"], { chip: string; value: string }> = {
  brand: { chip: "bg-brand-50 text-brand-700", value: "text-brand-700" },
  neutral: { chip: "bg-muted text-foreground-muted", value: "text-foreground" },
  danger: { chip: "bg-danger-bg text-danger", value: "text-danger" },
};

export function ProjectHealthCard({ health }: ProjectHealthCardProps) {
  const rows: Row[] = [
    { icon: FolderKanban, label: "پروژه‌های فعال", count: health.active, tone: "brand" },
    { icon: CalendarClock, label: "پایان‌یافته (گذشته از تاریخ پایان)", count: health.pastEndDate, tone: "neutral" },
    { icon: AlertTriangle, label: "دارای قسط سررسید گذشته", count: health.withOverdueInstallments, tone: "danger" },
  ];

  return (
    <Card title="وضعیت پروژه‌ها" description="تعداد پروژه‌ها بر اساس وضعیت زمان‌بندی.">
      <div className="flex flex-col gap-1">
        {rows.map((row) => {
          const Icon = row.icon;
          const tone = TONE[row.tone];
          return (
            <div
              key={row.label}
              className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0"
            >
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${tone.chip}`}
                aria-hidden
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0 text-sm text-foreground-muted">{row.label}</span>
              <span className={`text-base font-bold tabular-nums shrink-0 ${tone.value}`}>
                {toPersianDigits(row.count)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 pt-2 flex items-center justify-between gap-2 text-xs text-foreground-subtle">
        <span>مجموع پروژه‌ها</span>
        <span className="font-bold tabular-nums">{toPersianDigits(health.total)}</span>
      </div>
    </Card>
  );
}
