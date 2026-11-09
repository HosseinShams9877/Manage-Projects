"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/core/components/Modal";
import { Button } from "@/core/components/Button";
import { Input } from "@/core/components/Input";
import { CurrencyInput } from "@/core/components/CurrencyInput";
import { JalaliDatePicker } from "@/core/components/JalaliDatePicker";
import { parseAmountToRial } from "@/core/lib/format";
import { useBulkCreateInstallments } from "../hooks";
import { previewBulkPlan } from "../lib/plan";
import type { BulkInstallmentFormValues } from "../lib/schema";

interface BulkInstallmentFormProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSaved?: () => void;
}

const EMPTY_FORM: BulkInstallmentFormValues = {
  totalAmount: "",
  count: 3,
  firstDueDate: "",
  intervalMonths: 1,
  note: "",
};

const INTERVAL_OPTIONS = [1, 2, 3, 4, 6, 12];

export function BulkInstallmentForm({ open, onClose, projectId, onSaved }: BulkInstallmentFormProps) {
  const [values, setValues] = useState<BulkInstallmentFormValues>(EMPTY_FORM);
  const { mutateAsync, isPending } = useBulkCreateInstallments(projectId);

  useEffect(() => {
    if (open) setValues(EMPTY_FORM);
  }, [open]);

  const set = <K extends keyof BulkInstallmentFormValues>(
    key: K,
  ) => (v: BulkInstallmentFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  /** Live preview: what the server will create, before anything is committed. */
  const preview = useMemo(() => {
    const totalRial = parseAmountToRial(values.totalAmount);
    if (!totalRial || !values.firstDueDate) return null;
    return previewBulkPlan(totalRial, values.count, values.firstDueDate, values.intervalMonths);
  }, [values.totalAmount, values.count, values.firstDueDate, values.intervalMonths]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync({ projectId, ...values });
      onSaved?.();
      onClose();
    } catch {
      // The hook already surfaced a Persian toast; keep the dialog open.
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="اقساط دوره‌ای"
      description="مبلغ کل را به چند قسط مساوی با فاصله ماهانه تقسیم کنید."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending} type="button">
            انصراف
          </Button>
          <Button type="submit" form="bulk-installment-form" loading={isPending} disabled={!preview}>
            ثبت {values.count} قسط
          </Button>
        </>
      }
    >
      <form id="bulk-installment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <CurrencyInput
          label="مبلغ کل"
          required
          value={values.totalAmount}
          onChange={(v) => set("totalAmount")(v)}
          hint="مبلغ کل به تومان وارد می‌شود و بین اقساط تقسیم می‌گردد."
          disabled={isPending}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="تعداد اقساط"
            name="count"
            type="number"
            min={2}
            max={60}
            required
            value={values.count}
            onChange={(e) => set("count")(Number(e.target.value))}
            disabled={isPending}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bulk-interval" className="text-sm font-medium text-foreground">
              فاصله اقساط
            </label>
            <select
              id="bulk-interval"
              value={values.intervalMonths}
              onChange={(e) => set("intervalMonths")(Number(e.target.value))}
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
            >
              {INTERVAL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  هر {m} ماه
                </option>
              ))}
            </select>
          </div>
        </div>

        <JalaliDatePicker
          label="سررسید قسط اول"
          required
          value={values.firstDueDate || null}
          onChange={(iso) => set("firstDueDate")(iso ?? "")}
          disabled={isPending}
        />

        <Input
          label="توضیحات"
          name="note"
          value={values.note}
          onChange={(e) => set("note")(e.target.value)}
          placeholder="توضیحات اختیاری (برای همه اقساط)"
          disabled={isPending}
        />

        {preview && preview.length > 0 && (
          <div className="rounded-lg border border-border bg-surface-2 p-3 max-h-56 overflow-y-auto">
            <p className="text-xs font-medium text-foreground-muted mb-2">
              پیش‌نمایش اقساط ({preview.length} قسط)
            </p>
            <ul className="flex flex-col divide-y divide-border">
              {preview.map((row, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="text-foreground-muted tabular-nums">{row.dueDateLabel}</span>
                  <span className="font-medium text-foreground tabular-nums">{row.amountLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </Modal>
  );
}
