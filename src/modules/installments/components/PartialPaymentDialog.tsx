"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/core/components/Modal";
import { Button } from "@/core/components/Button";
import { Input } from "@/core/components/Input";
import { CurrencyInput } from "@/core/components/CurrencyInput";
import { JalaliDatePicker } from "@/core/components/JalaliDatePicker";
import { formatToman } from "@/core/lib/format";
import { useRecordPartialPayment, type PartialPaymentVars } from "../hooks";
import type { InstallmentDTO, PartialPaymentFormValues } from "../lib/schema";

interface PartialPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  installment: InstallmentDTO | null;
  onSaved?: (id: string) => void;
}

const EMPTY_FORM: PartialPaymentFormValues = { amount: "", jalaliDate: "", note: "" };

export function PartialPaymentDialog({
  open,
  onClose,
  projectId,
  installment,
  onSaved,
}: PartialPaymentDialogProps) {
  const [values, setValues] = useState<PartialPaymentFormValues>(EMPTY_FORM);
  const { mutateAsync, isPending } = useRecordPartialPayment(projectId);

  // Reset the draft whenever the dialog (re)opens or its target changes.
  useEffect(() => {
    if (!open) return;
    setValues(EMPTY_FORM);
  }, [open, installment]);

  const set = <K extends keyof PartialPaymentFormValues>(
    key: K,
  ) => (v: PartialPaymentFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  if (!installment) return null;

  /** Amounts are RIAL BigInt server-side; the input works in TOMAN. */
  const remainingToman = BigInt(installment.remainingAmount) / 10n;
  const remainingLabel = formatToman(installment.remainingAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vars: PartialPaymentVars = { installmentId: installment.id, ...values };
    try {
      const updated = await mutateAsync(vars);
      onSaved?.(updated.id);
      onClose();
    } catch {
      // The hook already surfaced a Persian toast; keep the dialog open so the
      // user can fix the input (e.g. an amount above the remaining balance).
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="ثبت پرداخت قسط"
      description={`مانده این قسط: ${remainingLabel}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending} type="button">
            انصراف
          </Button>
          <Button type="submit" form="partial-payment-form" loading={isPending}>
            ثبت پرداخت
          </Button>
        </>
      }
    >
      <form id="partial-payment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <CurrencyInput
          label="مبلغ پرداختی"
          required
          value={values.amount}
          onChange={(v) => set("amount")(v)}
          hint={`حداکثر ${formatToman(BigInt(remainingToman * 10n))}`}
          disabled={isPending}
        />

        <JalaliDatePicker
          label="تاریخ پرداخت"
          required
          value={values.jalaliDate || null}
          onChange={(iso) => set("jalaliDate")(iso ?? "")}
          disabled={isPending}
        />

        <Input
          label="توضیحات"
          name="note"
          value={values.note}
          onChange={(e) => set("note")(e.target.value)}
          placeholder="توضیحات اختیاری"
          disabled={isPending}
        />
      </form>
    </Modal>
  );
}
