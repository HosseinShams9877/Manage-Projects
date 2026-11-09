"use client";

import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Card } from "@/core/components/Card";
import { Badge } from "@/core/components/Badge";
import { Button } from "@/core/components/Button";
import { Table } from "@/core/components/Table";
import { formatJalali, formatToman } from "@/core/lib/format";
import { useEmployeeBalance, useEmployeePayments } from "../hooks";
import { EmployeePaymentTable } from "./EmployeePaymentTable";
import { EmployeePaymentForm } from "./EmployeePaymentForm";
import { DeleteEmployeePaymentDialog } from "./DeleteEmployeePaymentDialog";
import type { EmployeePaymentDTO } from "../lib/schema";

interface EmployeeDetailScreenProps {
  id: string;
  /** Admin view can create/edit/delete; the employee's own view is read-only. */
  canManage: boolean;
  /** Where the "back" link points. */
  backHref?: string;
}

const BALANCE_COLUMNS = [
  "پروژه",
  "درصد سهم",
  "مبلغ سهم",
  "پرداخت‌شده",
  "مانده",
  "آخرین پرداخت",
];

export function EmployeeDetailScreen({ id, canManage, backHref }: EmployeeDetailScreenProps) {
  const { data: balance, isLoading } = useEmployeeBalance(id);
  const { data: paymentsData, isLoading: paymentsLoading } = useEmployeePayments({ userId: id });
  const payments = paymentsData?.payments ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeePaymentDTO | null>(null);
  const [deleting, setDeleting] = useState<EmployeePaymentDTO | null>(null);

  const handleEdit = (payment: EmployeePaymentDTO) => {
    setEditing(payment);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  if (isLoading || !balance) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-foreground-muted">در حال بارگذاری…</p>
      </div>
    );
  }

  const projects = balance.projects;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3">
        {backHref && (
          <a
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors w-fit"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت به فهرست
          </a>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{balance.name}</h2>
            <p dir="ltr" className="text-sm text-foreground-muted mt-1 text-right">
              {balance.email}
            </p>
          </div>
          <Badge tone={balance.role === "ADMIN" ? "info" : "neutral"}>
            {balance.role === "ADMIN" ? "مدیر" : "کارمند"}
          </Badge>
        </div>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-foreground-muted">مجموع سهم</p>
          <p className="text-lg font-bold text-foreground mt-1.5 tabular-nums">
            {formatToman(balance.totalShare)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-foreground-muted">مجموع پرداخت‌شده</p>
          <p className="text-lg font-bold text-foreground mt-1.5 tabular-nums">
            {formatToman(balance.totalPaid)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-foreground-muted">مجموع مانده</p>
          <p className="text-lg font-bold text-foreground mt-1.5 tabular-nums">
            {formatToman(balance.totalRemaining)}
          </p>
        </Card>
      </div>

      {/* Per-project breakdown */}
      <Card title="سهم در پروژه‌ها" description="اختصاص کارمند و وضعیت پرداخت هر پروژه.">
        {projects.length === 0 ? (
          <p className="text-sm text-foreground-muted py-2">
            این کارمند به هیچ پروژه‌ای اختصاص نیافته است.
          </p>
        ) : (
          <>
            <div className="hidden md:block -mx-4">
              <Table
                columns={BALANCE_COLUMNS}
                rows={projects.map((p) => [
                  <span key="title" className="font-medium text-foreground">
                    {p.title}
                  </span>,
                  <span key="percent" className="tabular-nums">
                    {p.sharePercent}٪
                  </span>,
                  <span key="share" className="tabular-nums whitespace-nowrap">
                    {formatToman(p.shareAmount)}
                  </span>,
                  <span key="paid" className="tabular-nums whitespace-nowrap">
                    {formatToman(p.paid)}
                  </span>,
                  <Badge
                    key="remaining"
                    tone={BigInt(p.remaining) <= 0n ? "success" : "warning"}
                  >
                    <span className="tabular-nums">{formatToman(p.remaining)}</span>
                  </Badge>,
                  <span key="last" className="tabular-nums text-foreground-muted whitespace-nowrap">
                    {p.lastPaymentDate ? formatJalali(p.lastPaymentDate) : "—"}
                  </span>,
                ])}
                emptyText=""
              />
            </div>
            <div className="flex flex-col gap-3 md:hidden">
              {projects.map((p) => (
                <div
                  key={p.projectId}
                  className="rounded-lg border border-border bg-background p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{p.title}</span>
                    <span className="text-xs text-foreground-muted tabular-nums">
                      {p.sharePercent}٪
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground-muted">مبلغ سهم</span>
                    <span className="tabular-nums text-foreground">{formatToman(p.shareAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground-muted">پرداخت‌شده</span>
                    <span className="tabular-nums text-foreground">{formatToman(p.paid)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground-muted">مانده</span>
                    <Badge tone={BigInt(p.remaining) <= 0n ? "success" : "warning"}>
                      <span className="tabular-nums">{formatToman(p.remaining)}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground-muted">آخرین پرداخت</span>
                    <span className="tabular-nums text-foreground-muted">
                      {p.lastPaymentDate ? formatJalali(p.lastPaymentDate) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Payment history */}
      <Card
        title="پرداخت‌های کارمند"
        description="تاریخچه پرداخت‌های ثبت‌شده به این کارمند."
        actions={
          canManage ? (
            <Button size="sm" onClick={handleCreate}>
              <Plus className="w-4 h-4" />
              پرداخت جدید
            </Button>
          ) : undefined
        }
      >
        <EmployeePaymentTable
          payments={payments}
          canManage={canManage}
          onEdit={canManage ? handleEdit : undefined}
          onDelete={canManage ? (p) => setDeleting(p) : undefined}
          emptyText={paymentsLoading ? "در حال بارگذاری…" : "پرداختی ثبت نشده است."}
        />
      </Card>

      {canManage && (
        <>
          <EmployeePaymentForm
            open={formOpen}
            onClose={() => setFormOpen(false)}
            userId={id}
            userName={balance.name}
            balance={balance}
            payment={editing}
          />
          <DeleteEmployeePaymentDialog
            open={deleting !== null}
            onClose={() => setDeleting(null)}
            payment={deleting}
          />
        </>
      )}
    </div>
  );
}
