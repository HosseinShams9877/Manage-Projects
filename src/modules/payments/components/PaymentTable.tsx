"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Table } from "@/core/components/Table";
import { formatJalali, formatToman } from "@/core/lib/format";
import type { EmployerPaymentDTO } from "../lib/schema";

interface PaymentTableProps {
  payments: EmployerPaymentDTO[];
  /** Whether the viewer may edit/delete (admin). */
  canManage: boolean;
  onEdit?: (payment: EmployerPaymentDTO) => void;
  onDelete?: (payment: EmployerPaymentDTO) => void;
  emptyText?: string;
}

const COLUMNS = ["تاریخ", "مبلغ", "توضیح", "عملیات"];

export function PaymentTable({
  payments,
  canManage,
  onEdit,
  onDelete,
  emptyText = "پرداختی ثبت نشده است.",
}: PaymentTableProps) {
  return (
    <>
      {/* Desktop: table */}
      <div className="hidden md:block">
        <Table
          columns={COLUMNS}
          rows={payments.map((p) => [
            <span key="date" className="tabular-nums whitespace-nowrap">
              {formatJalali(p.jalaliDate)}
            </span>,
            <span key="amount" className="tabular-nums whitespace-nowrap font-medium">
              {formatToman(p.amount)}
            </span>,
            <span key="note" className="text-foreground-muted">
              {p.note || "—"}
            </span>,
            canManage ? (
              <div key="actions" className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit?.(p)}
                  className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  aria-label="ویرایش پرداخت"
                  title="ویرایش"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(p)}
                  className="p-1.5 rounded-md text-foreground-muted hover:text-danger hover:bg-danger-bg transition-colors"
                  aria-label="حذف پرداخت"
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
        {payments.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-foreground-subtle text-sm">
            {emptyText}
          </div>
        ) : (
          payments.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground tabular-nums">
                    {formatToman(p.amount)}
                  </p>
                  <p className="text-xs text-foreground-muted mt-0.5 tabular-nums">
                    {formatJalali(p.jalaliDate)}
                  </p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit?.(p)}
                      className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                      aria-label="ویرایش"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(p)}
                      className="p-1.5 rounded-md text-foreground-muted hover:text-danger hover:bg-danger-bg transition-colors"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {p.note && <p className="text-xs text-foreground-muted">{p.note}</p>}
            </div>
          ))
        )}
      </div>
    </>
  );
}
