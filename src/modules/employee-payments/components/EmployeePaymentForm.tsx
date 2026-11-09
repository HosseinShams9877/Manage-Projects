"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/core/components/Modal";
import { Button } from "@/core/components/Button";
import { Input } from "@/core/components/Input";
import { CurrencyInput } from "@/core/components/CurrencyInput";
import { JalaliDatePicker } from "@/core/components/JalaliDatePicker";
import { formatToman } from "@/core/lib/format";
import { useCreateEmployeePayment, useUpdateEmployeePayment } from "../hooks";
import type {
  EmployeeBalanceDTO,
  EmployeePaymentDTO,
  EmployeePaymentFormValues,
} from "../lib/schema";

interface EmployeePaymentFormProps {
  open: boolean;
  onClose: () => void;
  /** The employee being paid (fixed — the dialog opens from their page). */
  userId: string;
  userName: string;
  /** The employee's balance: supplies the assignable projects + remainders. */
  balance: EmployeeBalanceDTO | null | undefined;
  /** Payment being edited; undefined = create mode. */
  payment?: EmployeePaymentDTO | null;
  onSaved?: (id: string) => void;
}

/** Seed the form from an existing payment (RIAL string → TOMAN string). */
function paymentToForm(payment: EmployeePaymentDTO): EmployeePaymentFormValues {
  return {
    userId: payment.userId,
    projectId: payment.projectId,
    amount: (BigInt(payment.amount) / 10n).toString(),
    jalaliDate: payment.jalaliDate,
    note: payment.note,
  };
}

export function EmployeePaymentForm({
  open,
  onClose,
  userId,
  userName,
  balance,
  payment,
  onSaved,
}: EmployeePaymentFormProps) {
  const isEdit = !!payment;
  const projects = balance?.projects ?? [];

  const [values, setValues] = useState<EmployeePaymentFormValues>({
    userId,
    projectId: "",
    amount: "",
    jalaliDate: "",
    note: "",
  });

  const { mutateAsync: createAsync, isPending: creating } = useCreateEmployeePayment();
  const { mutateAsync: updateAsync, isPending: updating } = useUpdateEmployeePayment();

  // Reset the draft whenever the dialog (re)opens or its target changes.
  useEffect(() => {
    if (!open) return;
    setValues(
      payment
        ? paymentToForm(payment)
        : { userId, projectId: projects[0]?.projectId ?? "", amount: "", jalaliDate: "", note: "" },
    );
  }, [open, payment, userId, projects]);

  const set = <K extends keyof EmployeePaymentFormValues>(key: K) => (v: EmployeePaymentFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const selected = projects.find((p) => p.projectId === values.projectId);

  // Live remainder of the chosen project; when editing, the current row's own
  // amount is still part of the paid sum server-side, so it is added back.
  const remainingRial = useMemo(() => {
    if (!selected) return null;
    let r = BigInt(selected.remaining);
    if (isEdit && payment && payment.projectId === selected.projectId) {
      r += BigInt(payment.amount);
    }
    return r;
  }, [selected, isEdit, payment]);

  const overflows = useMemo(() => {
    if (!remainingRial || !values.amount) return false;
    const cleaned = values.amount.replace(/[,\s٬]/g, "");
    if (!/^\d+$/.test(cleaned)) return false;
    return BigInt(cleaned) * 10n > remainingRial;
  }, [remainingRial, values.amount]);

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
      // user can fix the input (e.g. an amount above the employee's remainder).
    }
  };

  const pending = creating || updating;
  const noProjects = projects.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "ویرایش پرداخت کارمند" : "پرداخت جدید به کارمند"}
      description={
        isEdit
          ? "پروژه، مبلغ یا تاریخ پرداخت را به‌روزرسانی کنید."
          : `پرداختی به «${userName}» ثبت کنید.`
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending} type="button">
            انصراف
          </Button>
          <Button
            type="submit"
            form="employee-payment-form"
            loading={pending}
            disabled={noProjects}
          >
            {isEdit ? "ذخیره تغییرات" : "ثبت پرداخت"}
          </Button>
        </>
      }
    >
      <form id="employee-payment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {noProjects ? (
          <p className="text-sm text-warning bg-warning-bg border border-warning/30 rounded-md px-3 py-2.5">
            این کارمند به هیچ پروژه‌ای اختصاص نیافته است.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="employee-payment-project" className="text-sm font-medium text-foreground">
                پروژه
              </label>
              <select
                id="employee-payment-project"
                aria-label="پروژه"
                disabled={pending}
                value={values.projectId}
                onChange={(e) => set("projectId")(e.target.value)}
                className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
              >
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.title}
                  </option>
                ))}
              </select>
              {selected && remainingRial !== null && (
                <p className="text-xs text-foreground-muted tabular-nums">
                  مانده حساب کارمند در این پروژه: {formatToman(remainingRial)}
                </p>
              )}
            </div>

            <CurrencyInput
              label="مبلغ پرداخت"
              required
              value={values.amount}
              onChange={(v) => set("amount")(v)}
              hint="مبلغ به تومان وارد می‌شود."
              disabled={pending}
            />
            {overflows && (
              <p className="text-xs text-danger -mt-2">مبلغ واردشده بیشتر از مانده حساب است.</p>
            )}

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
          </>
        )}
      </form>
    </Modal>
  );
}
