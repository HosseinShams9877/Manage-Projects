"use client";

import { useMemo } from "react";
import { FolderOpen } from "lucide-react";
import { useEmployeeBalances } from "../hooks";
import { formatToman } from "@/core/lib/format";
import type { EmployeeBalanceDTO } from "../lib/schema";

interface EmployeesListTableProps {
  /** Server-fetched rows, so the table is populated in the SSR HTML too. */
  employees: EmployeeBalanceDTO[];
  /** Base path for the employee detail page, e.g. "/admin/employees". */
  basePath: string;
}

const COLUMNS = [
  "نام",
  "ایمیل",
  "تعداد پروژه‌ها",
  "مجموع سهم",
  "مجموع پرداخت‌شده",
  "مانده حساب",
  "عملیات",
] as const;

/**
 * Tone of the “مانده حساب” cell. The balances DTO carries no due dates, so
 * “past due” is approximated by magnitude: nothing left → success (settled),
 * at most a quarter of the share outstanding → warning (small remainder),
 * more than that unpaid → danger (at-risk liability).
 */
function remainingTone(totalShare: string, totalRemaining: string): string {
  const remaining = BigInt(totalRemaining);
  if (remaining <= 0n) return "text-success";
  const share = BigInt(totalShare);
  if (share > 0n && remaining * 4n <= share) return "text-warning";
  return "text-danger";
}

export function EmployeesListTable({ employees, basePath }: EmployeesListTableProps) {
  // Server-supplied rows hydrate the cache; the hook then refreshes in place.
  const { data, isLoading } = useEmployeeBalances(
    employees.length > 0 ? { employees } : undefined,
  );
  const rows = useMemo(() => data?.employees ?? [], [data]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">کارمندان</h2>
        <p className="text-sm text-foreground-muted mt-1">
          {isLoading && rows.length === 0 ? "در حال بارگذاری…" : `${rows.length} کارمند`}
        </p>
      </div>

      {/* Desktop: table. The whole row opens the employee file; the name cell
          carries the real link so keyboards/screen readers have an anchor. */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 border-b border-border">
                {COLUMNS.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-right font-medium text-foreground-muted whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-4 py-8 text-center text-foreground-subtle"
                  >
                    {isLoading ? "در حال بارگذاری…" : "کارمندی یافت نشد."}
                  </td>
                </tr>
              ) : (
                rows.map((e) => {
                  const href = `${basePath}/${e.userId}`;
                  return (
                    <tr
                      key={e.userId}
                      onClick={() => {
                        window.location.href = href;
                      }}
                      className="border-b border-border last:border-0 hover:bg-surface-2/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <a
                          href={href}
                          className="font-medium text-foreground hover:text-brand-600 transition-colors"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {e.name}
                        </a>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span dir="ltr" className="text-foreground-muted text-sm text-right">
                          {e.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {e.projects.length}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {formatToman(e.totalShare)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {formatToman(e.totalPaid)}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap tabular-nums font-medium ${remainingTone(
                          e.totalShare,
                          e.totalRemaining,
                        )}`}
                      >
                        {formatToman(e.totalRemaining)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <a
                          href={href}
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                        >
                          <FolderOpen className="w-4 h-4" />
                          پرونده کارمند
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-foreground-subtle text-sm">
            {isLoading ? "در حال بارگذاری…" : "کارمندی یافت نشد."}
          </div>
        ) : (
          rows.map((e) => {
            const href = `${basePath}/${e.userId}`;
            return (
              <a
                key={e.userId}
                href={href}
                className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-2 hover:bg-surface-2 transition-colors"
              >
                <span className="text-sm font-medium text-foreground">{e.name}</span>
                <span dir="ltr" className="text-xs text-foreground-muted text-right">
                  {e.email}
                </span>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-foreground-muted tabular-nums">
                    {e.projects.length} پروژه
                  </span>
                  <span className="text-xs tabular-nums">{formatToman(e.totalShare)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-foreground-muted">مانده حساب</span>
                  <span
                    className={`text-xs tabular-nums font-medium ${remainingTone(
                      e.totalShare,
                      e.totalRemaining,
                    )}`}
                  >
                    {formatToman(e.totalRemaining)}
                  </span>
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
