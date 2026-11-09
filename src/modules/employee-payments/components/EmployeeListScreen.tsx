"use client";

import { useMemo } from "react";
import { Table } from "@/core/components/Table";
import { Badge } from "@/core/components/Badge";
import { formatToman } from "@/core/lib/format";
import { useEmployeeBalances } from "../hooks";
import type { EmployeeBalanceDTO } from "../lib/schema";

interface EmployeeListScreenProps {
  /** Base path for the detail page, e.g. "/admin/employees". */
  basePath: string;
}

const COLUMNS = ["نام", "ایمیل", "نقش", "تعداد پروژه", "مانده حساب"];

function remainingTone(totalRemaining: string): "success" | "warning" | "danger" {
  const r = BigInt(totalRemaining);
  if (r <= 0n) return "success";
  // Anything outstanding is a liability to track — warn when half is unpaid.
  return "warning";
}

export function EmployeeListScreen({ basePath }: EmployeeListScreenProps) {
  const { data, isLoading } = useEmployeeBalances();
  const employees = useMemo(() => data?.employees ?? [], [data]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">کارمندان</h2>
        <p className="text-sm text-foreground-muted mt-1">
          {isLoading ? "در حال بارگذاری…" : `${employees.length} کارمند`}
        </p>
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block">
        <Table
          columns={COLUMNS}
          rows={employees.map((e: EmployeeBalanceDTO) => [
            <a
              key="name"
              href={`${basePath}/${e.userId}`}
              className="font-medium text-foreground hover:text-brand-600 transition-colors"
            >
              {e.name}
            </a>,
            <span key="email" dir="ltr" className="text-foreground-muted text-sm text-right">
              {e.email}
            </span>,
            <Badge key="role" tone={e.role === "ADMIN" ? "info" : "neutral"}>
              {e.role === "ADMIN" ? "مدیر" : "کارمند"}
            </Badge>,
            <span key="count" className="tabular-nums">
              {e.projects.length}
            </span>,
            <Badge key="remaining" tone={remainingTone(e.totalRemaining)}>
              <span className="tabular-nums">{formatToman(e.totalRemaining)}</span>
            </Badge>,
          ])}
          emptyText={isLoading ? "در حال بارگذاری…" : "کارمندی یافت نشد."}
        />
      </div>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {employees.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-foreground-subtle text-sm">
            {isLoading ? "در حال بارگذاری…" : "کارمندی یافت نشد."}
          </div>
        ) : (
          employees.map((e) => (
            <a
              key={e.userId}
              href={`${basePath}/${e.userId}`}
              className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-2 hover:bg-surface-2 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{e.name}</span>
                <Badge tone={e.role === "ADMIN" ? "info" : "neutral"}>
                  {e.role === "ADMIN" ? "مدیر" : "کارمند"}
                </Badge>
              </div>
              <span dir="ltr" className="text-xs text-foreground-muted text-right">
                {e.email}
              </span>
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-foreground-muted tabular-nums">
                  {e.projects.length} پروژه
                </span>
                <Badge tone={remainingTone(e.totalRemaining)}>
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
