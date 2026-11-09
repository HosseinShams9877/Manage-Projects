"use client";

import { useState } from "react";
import { ArrowRight, Plus, Wallet } from "lucide-react";
import { Card } from "@/core/components/Card";
import { Badge } from "@/core/components/Badge";
import { Button } from "@/core/components/Button";
import { Table } from "@/core/components/Table";
import { formatJalali, formatToman } from "@/core/lib/format";
import { useEmployeeBalance, useEmployeePayments } from "../hooks";
import { EmployeePaymentTable } from "./EmployeePaymentTable";
import { EmployeePaymentForm } from "./EmployeePaymentForm";
import { EmployeePaymentCreateDialog } from "./EmployeePaymentCreateDialog";
import { ProjectEmployeePaymentDialog } from "./ProjectEmployeePaymentDialog";
import { DeleteEmployeePaymentDialog } from "./DeleteEmployeePaymentDialog";
import type {
  EmployeeBalanceDTO,
  EmployeePaymentDTO,
  EmployeePaymentListDTO,
} from "../lib/schema";

interface EmployeeDetailScreenProps {
  id: string;
  /** Admin view can create/edit/delete; the employee's own view is read-only. */
  canManage: boolean;
  /** Where the "back" link points. */
  backHref?: string;
  /** Server-fetched balance, so the page is populated in the SSR HTML too. */
  initialBalance?: EmployeeBalanceDTO;
  /** Server-fetched payments, same reason as above. */
  initialPayments?: EmployeePaymentListDTO;
}

const BALANCE_COLUMNS = [
  "پروژه",
  "درصد سهم",
  "مبلغ سهم",
  "پرداخت‌شده",
  "مانده",
  "آخرین پرداخت",
];
const BALANCE_COLUMNS_ADMIN = [...BALANCE_COLUMNS, "عملیات"];

export function EmployeeDetailScreen({
  id,
  canManage,
  backHref,
  initialBalance,
  initialPayments,
}: EmployeeDetailScreenProps) {
  const { data: balance, isLoading } = useEmployeeBalance(id, true, initialBalance);
  const { data: paymentsData, isLoading: paymentsLoading } = useEmployeePayments(
    { userId: id },
    initialPayments,
  );
  const payments = paymentsData?.payments ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeePaymentDTO | null>(null);
  const [deleting, setDeleting] = useState<EmployeePaymentDTO | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [projectPayment, setProjectPayment] = useState<{ projectId: string; title: string } | null>(
    null,
  );

  const handleEdit = (payment: EmployeePaymentDTO) => {
    setEditing(payment);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setCreateOpen(true);
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
                columns={canManage ? BALANCE_COLUMNS_ADMIN : BALANCE_COLUMNS}
                rows={projects.map((p) => {
                  const cells = [
                    <a
                      key="title"
                      href={`/admin/projects/${p.projectId}`}
                      className="font-medium text-foreground hover:text-brand-600 transition-colors"
                    >
                      {p.title}
                    </a>,
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
                  ];
                  if (canManage) {
                    cells.push(
                      <button
                        key="pay"
                        type="button"
                        onClick={() => setProjectPayment({ projectId: p.projectId, title: p.title })}
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        <Wallet className="w-4 h-4" />
                        ثبت پرداخت
                      </button>,
                    );
                  }
                  return cells;
                })}
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
                    <a
                      href={`/admin/projects/${p.projectId}`}
                      className="text-sm font-medium text-foreground hover:text-brand-600 transition-colors"
                    >
                      {p.title}
                    </a>
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
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setProjectPayment({ projectId: p.projectId, title: p.title })}
                      className="mt-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-border bg-surface text-sm font-medium text-brand-600 hover:bg-surface-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Wallet className="w-4 h-4" />
                      ثبت پرداخت
                    </button>
                  )}
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
          <EmployeePaymentCreateDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            userId={id}
            userName={balance.name}
          />
          <ProjectEmployeePaymentDialog
            open={projectPayment !== null}
            onOpenChange={(open) => {
              if (!open) setProjectPayment(null);
            }}
            projectId={projectPayment?.projectId ?? ""}
            projectTitle={projectPayment?.title ?? ""}
            userId={id}
            userName={balance.name}
          />
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
