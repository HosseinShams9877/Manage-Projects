"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/core/components/Modal";
import { Button } from "@/core/components/Button";
import { Input } from "@/core/components/Input";
import { CurrencyInput } from "@/core/components/CurrencyInput";
import { JalaliDatePicker } from "@/core/components/JalaliDatePicker";
import { useCreateInstallment, useUpdateInstallment } from "../hooks";
import type { InstallmentDTO, InstallmentFormValues } from "../lib/schema";

interface InstallmentFormProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** Installment being edited; undefined = create mode. */
  installment?: InstallmentDTO | null;
  onSaved?: (id: string) => void;
}

const EMPTY_FORM: InstallmentFormValues = { amount: "", dueDate: "", note: "" };

/** Seed the form from an existing installment (RIAL string → TOMAN string). */
function installmentToForm(installment: InstallmentDTO): InstallmentFormValues {
  return {
    amount: (BigInt(installment.amount) / 10n).toString(),
    dueDate: installment.dueDate,
    note: installment.note,
  };
}

export function InstallmentForm({
  open,
  onClose,
  projectId,
  installment,
  onSaved,
}: InstallmentFormProps) {
  const isEdit = !!installment;

  const [values, setValues] = useState<InstallmentFormValues>(EMPTY_FORM);

  const { mutateAsync: createAsync, isPending: creating } = useCreateInstallment(projectId);
  const { mutateAsync: updateAsync, isPending: updating } = useUpdateInstallment(projectId);

  // Reset the draft whenever the dialog (re)opens or its target changes.
  useEffect(() => {
    if (!open) return;
    setValues(installment ? installmentToForm(installment) : EMPTY_FORM);
  }, [open, installment]);

  const set = <K extends keyof InstallmentFormValues>(key: K) => (v: InstallmentFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && installment) {
        const updated = await updateAsync({ id: installment.id, ...values });
        onSaved?.(updated.id);
      } else {
        const created = await createAsync({ projectId, ...values });
        onSaved?.(created.id);
      }
      onClose();
    } catch {
      // The hook already surfaced a Persian toast; keep the dialog open so the
      // user can fix the input (e.g. a plan that exceeds the remaining debt).
    }
  };

  const pending = creating || updating;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "ویرایش قسط" : "قسط جدید"}
      description={
        isEdit
          ? "مبلغ یا سررسید قسط را به‌روزرسانی کنید."
          : "یک قسط یا چک جدید برای کارفرما ثبت کنید."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending} type="button">
            انصراف
          </Button>
          <Button type="submit" form="installment-form" loading={pending}>
            {isEdit ? "ذخیره تغییرات" : "ثبت قسط"}
          </Button>
        </>
      }
    >
      <form id="installment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <CurrencyInput
          label="مبلغ قسط"
          required
          value={values.amount}
          onChange={(v) => set("amount")(v)}
          hint="مبلغ به تومان وارد می‌شود."
          disabled={pending}
        />

        <JalaliDatePicker
          label="سررسید"
          required
          value={values.dueDate || null}
          onChange={(iso) => set("dueDate")(iso ?? "")}
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
