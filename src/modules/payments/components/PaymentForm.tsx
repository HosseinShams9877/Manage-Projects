"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/core/components/Modal";
import { Button } from "@/core/components/Button";
import { Input } from "@/core/components/Input";
import { CurrencyInput } from "@/core/components/CurrencyInput";
import { JalaliDatePicker } from "@/core/components/JalaliDatePicker";
import { useCreatePayment, useUpdatePayment } from "../hooks";
import type { EmployerPaymentDTO, PaymentFormValues } from "../lib/schema";

interface PaymentFormProps {
  open: boolean;
  onClose: () => void;
  /** Project this payment belongs to (fixed — the dialog opens from its page). */
  projectId: string;
  /** Payment being edited; undefined = create mode. */
  payment?: EmployerPaymentDTO | null;
  onSaved?: (id: string) => void;
}

const EMPTY_FORM: PaymentFormValues = { amount: "", jalaliDate: "", note: "" };

/** Seed the form from an existing payment (RIAL string → TOMAN string). */
function paymentToForm(payment: EmployerPaymentDTO): PaymentFormValues {
  return {
    amount: (BigInt(payment.amount) / 10n).toString(),
    jalaliDate: payment.jalaliDate,
    note: payment.note,
  };
}

export function PaymentForm({ open, onClose, projectId, payment, onSaved }: PaymentFormProps) {
  const isEdit = !!payment;

  const [values, setValues] = useState<PaymentFormValues>(EMPTY_FORM);

  const { mutateAsync: createAsync, isPending: creating } = useCreatePayment(projectId);
  const { mutateAsync: updateAsync, isPending: updating } = useUpdatePayment(projectId);

  // Reset the draft whenever the dialog (re)opens or its target changes.
  useEffect(() => {
    if (!open) return;
    setValues(payment ? paymentToForm(payment) : EMPTY_FORM);
  }, [open, payment]);

  const set = <K extends keyof PaymentFormValues>(key: K) => (v: PaymentFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && payment) {
        const updated = await updateAsync({ id: payment.id, ...values });
        onSaved?.(updated.id);
      } else {
        const created = await createAsync(values);
        onSaved?.(created.id);
      }
      onClose();
    } catch {
      // The hook already surfaced a Persian toast; keep the dialog open so the
      // user can fix the input (e.g. an amount above the outstanding debt).
    }
  };

  const pending = creating || updating;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "ویرایش پرداخت کارفرما" : "پرداخت جدید کارفرما"}
      description={
        isEdit
          ? "مبلغ یا تاریخ پرداخت را به‌روزرسانی کنید."
          : "مبلغ دریافتی از کارفرما را ثبت کنید."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending} type="button">
            انصراف
          </Button>
          <Button type="submit" form="payment-form" loading={pending}>
            {isEdit ? "ذخیره تغییرات" : "ثبت پرداخت"}
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <CurrencyInput
          label="مبلغ پرداخت"
          required
          value={values.amount}
          onChange={(v) => set("amount")(v)}
          hint="مبلغ به تومان وارد می‌شود."
          disabled={pending}
        />

        <JalaliDatePicker
          label="تاریخ پرداخت"
          required
          value={values.jalaliDate || null}
          onChange={(iso) => set("jalaliDate")(iso ?? "")}
          disabled={pending}
        />

        <Input
          label="توضیحات"
          name="note"
          value={values.note}
          onChange={(e) => set("note")(e.target.value)}
          placeholder="توضیحات اختیاری"
          disabled={pending}
        />
      </form>
    </Modal>
  );
}
