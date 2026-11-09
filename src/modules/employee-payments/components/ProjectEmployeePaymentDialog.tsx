"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/core/components/Modal";
import { Button } from "@/core/components/Button";
import { CurrencyInput } from "@/core/components/CurrencyInput";
import { JalaliDatePicker } from "@/core/components/JalaliDatePicker";
import { formatToman } from "@/core/lib/format";
import { QUERY_KEYS } from "@/core/constants";
import {
  invalidateEmployeeLedger,
  invalidateNotifications,
} from "@/core/lib/query-cache";
import { useCreateEmployeePayment, useEmployeeBalance } from "../hooks";
import type { EmployeePaymentFormValues } from "../lib/schema";

interface ProjectEmployeePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The project this payment is booked against (locked). */
  projectId: string;
  projectTitle: string;
  /** The employee being paid (locked). */
  userId: string;
  userName: string;
}

/**
 * Register a payment to one employee on one project — opened from either the
 * project's «سهم کارمندان» tab or the employee's file. Project and employee
 * are pre-filled and read-only, so only amount/date/note are editable.
 */
export function ProjectEmployeePaymentDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  userId,
  userName,
}: ProjectEmployeePaymentDialogProps) {
  const { data: balance } = useEmployeeBalance(userId);
  // Only this project's row matters here.
  const row = useMemo(
    () => balance?.projects.find((p) => p.projectId === projectId),
    [balance, projectId],
  );

  const [amount, setAmount] = useState("");
  const [jalaliDate, setJalaliDate] = useState("");
  const [note, setNote] = useState("");

  const queryClient = useQueryClient();

  // Reset the draft whenever the dialog (re)opens or its target changes.
  useEffect(() => {
    if (!open) return;
    setAmount("");
    setJalaliDate("");
    setNote("");
  }, [open, userId, projectId]);

  const remainingRial = row ? BigInt(row.remaining) : null;

  const overflows = useMemo(() => {
    if (remainingRial === null || !amount) return false;
    const cleaned = amount.replace(/[,\s٬]/g, "");
    if (!/^\d+$/.test(cleaned)) return false;
    return BigInt(cleaned) * 10n > remainingRial;
  }, [remainingRial, amount]);

  const { mutateAsync, isPending } = useCreateEmployeePayment({
    successMessage: `پرداخت به ${userName} ثبت شد.`,
    onSuccess: async () => {
      // The hook already refreshes the employee's ledger; the project detail
      // page also shows shares, so its cache is dropped too.
      await invalidateEmployeeLedger(queryClient, userId);
      await invalidateNotifications(queryClient);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.detail(projectId) });
      onOpenChange(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overflows || !amount || !jalaliDate) return;
    const values: EmployeePaymentFormValues = {
      userId,
      projectId,
      amount,
      jalaliDate,
      note,
    };
    try {
      await mutateAsync(values);
    } catch {
      // The hook already surfaced a Persian toast; keep the dialog open.
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title="ثبت پرداخت سهم کارمند"
      description={`پرداختی به «${userName}» از پروژه «${projectTitle}» ثبت کنید.`}
      fullScreenOnMobile
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            type="button"
          >
            انصراف
          </Button>
          <Button
            type="submit"
            form="project-employee-payment-form"
            loading={isPending}
            disabled={overflows}
          >
            ثبت پرداخت
          </Button>
        </>
      }
    >
      <form
        id="project-employee-payment-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground-muted">پروژه: </span>
            <span className="font-medium text-foreground">{projectTitle}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground-muted">کارمند: </span>
            <span className="font-medium text-foreground">{userName}</span>
          </div>
        </div>

        {row ? (
          <div className="flex flex-col gap-1 text-sm tabular-nums">
            <p className="text-foreground-muted">
              مبلغ سهم کارمند در این پروژه:{" "}
              <span className="font-medium text-foreground">{formatToman(row.shareAmount)}</span>
            </p>
            <p className="text-foreground-muted">
              پرداخت‌شده:{" "}
              <span className="font-medium text-foreground">{formatToman(row.paid)}</span>
            </p>
            <p className="text-foreground-muted">
              مانده:{" "}
              <span className="font-medium text-foreground">{formatToman(row.remaining)}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-warning bg-warning-bg border border-warning/30 rounded-md px-3 py-2.5">
            این کارمند در این پروژه سهمی ندارد.
          </p>
        )}

        <CurrencyInput
          label="مبلغ پرداخت"
          required
          value={amount}
          onChange={setAmount}
          hint="مبلغ به تومان وارد می‌شود."
          disabled={isPending || !row}
        />
        {overflows && (
          <p className="text-xs text-danger -mt-2">مبلغ بیشتر از مانده سهم این کارمند است.</p>
        )}

        <JalaliDatePicker
          label="تاریخ پرداخت"
          required
          value={jalaliDate || null}
          onChange={(iso) => setJalaliDate(iso ?? "")}
          disabled={isPending}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-employee-payment-note" className="text-sm font-medium text-foreground">
            توضیحات
          </label>
          <textarea
            id="project-employee-payment-note"
            name="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="توضیحات اختیاری"
            disabled={isPending}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50 resize-y"
          />
        </div>
      </form>
    </Modal>
  );
}
