"use client";

import { ConfirmDialog } from "@/core/components/ConfirmDialog";
import { formatJalali, formatToman } from "@/core/lib/format";
import { useDeletePayment } from "../hooks";
import type { EmployerPaymentDTO } from "../lib/schema";

interface DeletePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  payment: EmployerPaymentDTO | null;
  onDeleted?: (id: string) => void;
}

export function DeletePaymentDialog({
  open,
  onClose,
  projectId,
  payment,
  onDeleted,
}: DeletePaymentDialogProps) {
  const { mutateAsync: deleteAsync, isPending } = useDeletePayment(projectId);

  const handleConfirm = async () => {
    if (!payment) return;
    try {
      const { id } = await deleteAsync(payment.id);
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
      title="حذف پرداخت"
      description={
        payment ? (
          <>
            پرداخت <span className="font-medium tabular-nums">{formatToman(payment.amount)}</span>{" "}
            مورخ <span className="tabular-nums">{formatJalali(payment.jalaliDate)}</span> حذف می‌شود.
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
