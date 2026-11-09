"use client";

import { ConfirmDialog } from "@/core/components/ConfirmDialog";
import { formatJalali, formatToman } from "@/core/lib/format";
import { useDeleteEmployeePayment } from "../hooks";
import type { EmployeePaymentDTO } from "../lib/schema";

interface DeleteEmployeePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  payment: EmployeePaymentDTO | null;
  onDeleted?: (id: string) => void;
}

export function DeleteEmployeePaymentDialog({
  open,
  onClose,
  payment,
  onDeleted,
}: DeleteEmployeePaymentDialogProps) {
  const { mutateAsync: deleteAsync, isPending } = useDeleteEmployeePayment();

  const handleConfirm = async () => {
    if (!payment) return;
    try {
      const { id } = await deleteAsync(payment);
      onDeleted?.(id);
      onClose();
    } catch {
      // The hook already surfaced a Persian toast.
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="حذف پرداخت کارمند"
      description={
        payment ? (
          <>
            پرداخت <span className="font-medium tabular-nums">{formatToman(payment.amount)}</span>{" "}
            از پروژه «{payment.projectTitle}» مورخ{" "}
            <span className="tabular-nums">{formatJalali(payment.jalaliDate)}</span> حذف می‌شود.
            این عمل قابل بازگشت نیست.
          </>
        ) : (
          "این پرداخت حذف می‌شود."
        )
      }
      confirmText="حذف"
      cancelText="انصراف"
      destructive
      loading={isPending}
    />
  );
}
