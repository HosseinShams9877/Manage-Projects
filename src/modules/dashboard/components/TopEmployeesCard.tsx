/**
 * Top-employees card (Phase 6 §1) — the five employees with the largest
 * unsettled share (remaining desc), each with a paid/share progress bar.
 */

import { Crown } from "lucide-react";
import { Card } from "@/core/components/Card";
import { EmptyState } from "@/core/components/EmptyState";
import { ProgressBar } from "@/core/components/ProgressBar";
import { formatToman } from "@/core/lib/format";
import type { TopEmployeeDTO } from "../lib/schema";

interface TopEmployeesCardProps {
  employees: TopEmployeeDTO[];
}

export function TopEmployeesCard({ employees }: TopEmployeesCardProps) {
  return (
    <Card
      title="کارمندان برتر"
      description="بیشترین مانده تسویه، بر اساس سهم و دریافتی."
      actions={<Crown className="w-4 h-4 text-warning" aria-hidden />}
    >
      {employees.length === 0 ? (
        <EmptyState message="کارمندی یافت نشد." hint="پس از ثبت پروژه و سهم‌دهی، این فهرست کامل می‌شود." />
      ) : (
        <ol className="flex flex-col gap-4">
          {employees.map((e, index) => (
            <li key={e.userId} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-bold shrink-0 tabular-nums"
                    aria-hidden
                  >
                    {index === 0 ? "★" : index + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground truncate">{e.name}</span>
                </span>
                <span className="text-xs font-medium text-foreground-muted tabular-nums shrink-0">
                  {formatToman(e.remaining)}
                </span>
              </div>
              <ProgressBar value={BigInt(e.paid)} total={BigInt(e.share)} showLabel={false} />
              <div className="flex items-center justify-between gap-2 text-xs text-foreground-subtle tabular-nums">
                <span>دریافتی: {formatToman(e.paid)}</span>
                <span>سهم: {formatToman(e.share)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
