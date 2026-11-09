"use client";

import { useMemo, useState } from "react";
import { Table } from "@/core/components/Table";
import { Badge } from "@/core/components/Badge";
import { formatToman } from "@/core/lib/format";
import { useEmployeeBalances } from "../hooks";

interface EmployeeBalancesScreenProps {
  basePath: string;
}

type SortKey = "remainingDesc" | "remainingAsc" | "shareDesc" | "paidDesc";

const SORT_LABELS: Record<SortKey, string> = {
  remainingDesc: "بیشترین مانده",
  remainingAsc: "کمترین مانده",
  shareDesc: "بیشترین سهم",
  paidDesc: "بیشترین پرداخت‌شده",
};

const COLUMNS = ["کارمند", "تعداد پروژه", "مجموع سهم", "مجموع پرداخت‌شده", "مجموع مانده"];

export function EmployeeBalancesScreen({ basePath }: EmployeeBalancesScreenProps) {
  const { data, isLoading } = useEmployeeBalances();
  const [sort, setSort] = useState<SortKey>("remainingDesc");

  const rows = useMemo(() => {
    const list = [...(data?.employees ?? [])];
    const cmp = (a: bigint, b: bigint) => (a > b ? 1 : a < b ? -1 : 0);
    switch (sort) {
      case "remainingDesc":
        list.sort((x, y) => cmp(BigInt(y.totalRemaining), BigInt(x.totalRemaining)));
        break;
      case "remainingAsc":
        list.sort((x, y) => cmp(BigInt(x.totalRemaining), BigInt(y.totalRemaining)));
        break;
      case "shareDesc":
        list.sort((x, y) => cmp(BigInt(y.totalShare), BigInt(x.totalShare)));
        break;
      case "paidDesc":
        list.sort((x, y) => cmp(BigInt(y.totalPaid), BigInt(x.totalPaid)));
        break;
    }
    return list;
  }, [data, sort]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">مانده حساب‌ها</h2>
          <p className="text-sm text-foreground-muted mt-1">
            {isLoading ? "در حال بارگذاری…" : `${rows.length} کارمند`}
          </p>
        </div>
        <select
          aria-label="مرتب‌سازی"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 sm:w-44"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block">
        <Table
          columns={COLUMNS}
          rows={rows.map((e) => [
            <a
              key="name"
              href={`${basePath}/${e.userId}`}
              className="font-medium text-foreground hover:text-brand-600 transition-colors"
            >
              {e.name}
            </a>,
            <span key="count" className="tabular-nums">
              {e.projects.length}
            </span>,
            <span key="share" className="tabular-nums whitespace-nowrap">
              {formatToman(e.totalShare)}
            </span>,
            <span key="paid" className="tabular-nums whitespace-nowrap">
              {formatToman(e.totalPaid)}
            </span>,
            <Badge key="remaining" tone={BigInt(e.totalRemaining) <= 0n ? "success" : "warning"}>
              <span className="tabular-nums">{formatToman(e.totalRemaining)}</span>
            </Badge>,
          ])}
          emptyText={isLoading ? "در حال بارگذاری…" : "کارمندی یافت نشد."}
        />
      </div>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-foreground-subtle text-sm">
            {isLoading ? "در حال بارگذاری…" : "کارمندی یافت نشد."}
          </div>
        ) : (
          rows.map((e) => (
            <a
              key={e.userId}
              href={`${basePath}/${e.userId}`}
              className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-2 hover:bg-surface-2 transition-colors"
            >
              <span className="text-sm font-medium text-foreground">{e.name}</span>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-foreground-muted tabular-nums">
                  {e.projects.length} پروژه
                </span>
                <span className="text-foreground-muted">سهم: {formatToman(e.totalShare)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-foreground-muted">پرداخت‌شده: {formatToman(e.totalPaid)}</span>
                <Badge tone={BigInt(e.totalRemaining) <= 0n ? "success" : "warning"}>
                  <span className="tabular-nums">{formatToman(e.totalRemaining)}</span>
                </Badge>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
