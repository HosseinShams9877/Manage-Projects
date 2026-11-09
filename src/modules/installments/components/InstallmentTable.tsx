"use client";

import { CreditCard, Pencil, Trash2, CalendarClock } from "lucide-react";
import { Table } from "@/core/components/Table";
import { Badge } from "@/core/components/Badge";
import { INSTALLMENT_STATUS } from "@/core/constants";
import { formatJalali, formatToman } from "@/core/lib/format";
import type { InstallmentDTO, InstallmentStatus } from "../lib/schema";

interface InstallmentTableProps {
  installments: InstallmentDTO[];
  /** Whether the viewer may mutate (admin). */
  canManage: boolean;
  onPay?: (installment: InstallmentDTO) => void;
  onEdit?: (installment: InstallmentDTO) => void;
  onEditDueDate?: (installment: InstallmentDTO) => void;
  onDelete?: (installment: InstallmentDTO) => void;
  emptyText?: string;
}

const COLUMNS = ["سررسید", "مبلغ", "پرداخت‌شده", "مانده", "وضعیت", "عملیات"];

/** Status → badge tone (design tokens only; PENDING warning, PARTIAL info, PAID success). */
const TONE: Record<InstallmentStatus, "warning" | "info" | "success"> = {
  PENDING: "warning",
  PARTIAL: "info",
  PAID: "success",
};

function StatusBadge({ status }: { status: InstallmentStatus }) {
  return <Badge tone={TONE[status]}>{INSTALLMENT_STATUS[status]}</Badge>;
}

function rowClasses(i: InstallmentDTO): string {
  if (i.status === "PAID") return "text-foreground-muted";
  if (i.isPast) return "bg-danger-bg";
  return "";
}

export function InstallmentTable({
  installments,
  canManage,
  onPay,
  onEdit,
  onEditDueDate,
  onDelete,
  emptyText = "قسطی ثبت نشده است.",
}: InstallmentTableProps) {
  return (
    <>
      {/* Desktop: table */}
      <div className="hidden md:block">
        <Table
          columns={COLUMNS}
          rows={installments.map((i) => [
            <span key="due" className={`tabular-nums whitespace-nowrap ${rowClasses(i)}`}>
              {formatJalali(i.dueDate)}
            </span>,
            <span key="amount" className={`tabular-nums whitespace-nowrap font-medium ${rowClasses(i)}`}>
              {formatToman(i.amount)}
            </span>,
            <span key="paid" className="tabular-nums whitespace-nowrap text-foreground-muted">
              {BigInt(i.paidAmount) > 0n ? formatToman(i.paidAmount) : "—"}
            </span>,
            <span key="remaining" className="tabular-nums whitespace-nowrap">
              {formatToman(i.remainingAmount)}
            </span>,
            <StatusBadge key="status" status={i.status} />,
            canManage ? (
              <div key="actions" className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPay?.(i)}
                  disabled={i.status === "PAID"}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:text-brand-700 hover:bg-surface-2 transition-colors disabled:text-foreground-subtle disabled:hover:bg-transparent"
                  aria-label="ثبت پرداخت"
                  title="ثبت پرداخت"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  ثبت پرداخت
                </button>
                <button
                  type="button"
                  onClick={() => onEdit?.(i)}
                  className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  aria-label="ویرایش قسط"
                  title="ویرایش"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onEditDueDate?.(i)}
                  className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  aria-label="تغییر سررسید"
                  title="تغییر سررسید"
                >
                  <CalendarClock className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(i)}
                  className="p-1.5 rounded-md text-foreground-muted hover:text-danger hover:bg-danger-bg transition-colors"
                  aria-label="حذف قسط"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span key="actions" className="text-foreground-subtle text-xs">
                —
              </span>
            ),
          ])}
          emptyText={emptyText}
        />
      </div>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {installments.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-foreground-subtle text-sm">
            {emptyText}
          </div>
        ) : (
          installments.map((i) => (
            <div
              key={i.id}
              className={`rounded-lg border border-border bg-surface p-4 flex flex-col gap-2 ${
                i.status !== "PAID" && i.isPast ? "bg-danger-bg" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground tabular-nums">
                    {formatToman(i.amount)}
                  </p>
                  <p className="text-xs text-foreground-muted mt-0.5 tabular-nums">
                    سررسید: {formatJalali(i.dueDate)}
                  </p>
                </div>
                <StatusBadge status={i.status} />
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-foreground-muted tabular-nums">
                <span>پرداخت‌شده: {BigInt(i.paidAmount) > 0n ? formatToman(i.paidAmount) : "—"}</span>
                <span>مانده: {formatToman(i.remainingAmount)}</span>
              </div>

              {canManage && (
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <button
                    type="button"
                    onClick={() => onPay?.(i)}
                    disabled={i.status === "PAID"}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors disabled:text-foreground-subtle"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    ثبت پرداخت
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit?.(i)}
                    className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                    aria-label="ویرایش"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditDueDate?.(i)}
                    className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                    aria-label="تغییر سررسید"
                  >
                    <CalendarClock className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(i)}
                    className="p-1.5 rounded-md text-foreground-muted hover:text-danger hover:bg-danger-bg transition-colors"
                    aria-label="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
