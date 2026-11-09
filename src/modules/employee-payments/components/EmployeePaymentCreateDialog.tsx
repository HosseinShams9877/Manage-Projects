"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Search } from "lucide-react";
import { Modal } from "@/core/components/Modal";
import { Button } from "@/core/components/Button";
import { CurrencyInput } from "@/core/components/CurrencyInput";
import { JalaliDatePicker } from "@/core/components/JalaliDatePicker";
import { toPersianDigits, withSeparators } from "@/core/lib/format";
import { QUERY_KEYS } from "@/core/constants";
import {
  invalidateEmployeeLedger,
  invalidateNotifications,
} from "@/core/lib/query-cache";
import { useCreateEmployeePayment, useEmployeeAssignedProjects } from "../hooks";
import type { AssignedProjectDTO, EmployeePaymentFormValues } from "../lib/schema";

interface EmployeePaymentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The employee being paid (fixed). */
  userId: string;
  userName: string;
}

/** TOMAN string → Persian-grouped label with the unit (NOT formatToman, which
 *  expects RIAL and would divide by 10 — this endpoint already sends Toman). */
function tomanLabel(toman: string): string {
  return `${withSeparators(toPersianDigits(toman))} تومان`;
}

/**
 * New payment to an employee from their own page. Unlike the edit form, the
 * project is picked from a **searchable combobox** limited to the projects the
 * employee is actually assigned to.
 */
export function EmployeePaymentCreateDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: EmployeePaymentCreateDialogProps) {
  const queryClient = useQueryClient();
  const { data: projects, isLoading: loadingProjects } = useEmployeeAssignedProjects(userId);

  const [selected, setSelected] = useState<AssignedProjectDTO | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState("");
  const [jalaliDate, setJalaliDate] = useState("");
  const [note, setNote] = useState("");

  const comboRef = useRef<HTMLDivElement>(null);

  // Reset everything whenever the dialog (re)opens or its target changes.
  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setComboOpen(false);
    setQuery("");
    setAmount("");
    setJalaliDate("");
    setNote("");
  }, [open, userId]);

  // Close the popover on outside click.
  useEffect(() => {
    if (!comboOpen) return;
    const onClick = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [comboOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects ?? [];
    return (projects ?? []).filter((p) => p.projectTitle.toLowerCase().includes(q));
  }, [projects, query]);

  const remainingToman = selected ? BigInt(selected.remaining) : null;

  const overflows = useMemo(() => {
    if (remainingToman === null || !amount) return false;
    const cleaned = amount.replace(/[,\s٬]/g, "");
    if (!/^\d+$/.test(cleaned)) return false;
    // Both sides are TOMAN here — no ×10 conversion (unlike the RIAL DTOs).
    return BigInt(cleaned) > remainingToman;
  }, [remainingToman, amount]);

  const { mutateAsync, isPending } = useCreateEmployeePayment({
    successMessage: `پرداخت به ${userName} ثبت شد.`,
    onSuccess: async () => {
      await invalidateEmployeeLedger(queryClient, userId);
      await invalidateNotifications(queryClient);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all });
      onOpenChange(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || overflows || !amount || !jalaliDate) return;
    const values: EmployeePaymentFormValues = {
      userId,
      projectId: selected.projectId,
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

  const noProjects = !loadingProjects && (projects?.length ?? 0) === 0;

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title="پرداخت جدید به کارمند"
      description={`پرداختی به «${userName}» ثبت کنید.`}
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
            form="employee-payment-create-form"
            loading={isPending}
            disabled={overflows || !selected}
          >
            ثبت پرداخت
          </Button>
        </>
      }
    >
      <form
        id="employee-payment-create-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        {noProjects ? (
          <p className="text-sm text-warning bg-warning-bg border border-warning/30 rounded-md px-3 py-2.5">
            این کارمند به هیچ پروژه‌ای اختصاص نیافته است.
          </p>
        ) : (
          <>
            {/* Searchable project combobox (own projects only). */}
            <div className="flex flex-col gap-1.5" ref={comboRef}>
              <label htmlFor="employee-payment-project-combo" className="text-sm font-medium text-foreground">
                پروژه
              </label>
              <button
                id="employee-payment-project-combo"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={comboOpen}
                disabled={isPending}
                onClick={() => setComboOpen((v) => !v)}
                className="h-10 flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-sm text-foreground text-right focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
              >
                <span className={selected ? "" : "text-foreground-subtle"}>
                  {selected ? selected.projectTitle : "انتخاب پروژه…"}
                </span>
                <ChevronDown className="w-4 h-4 text-foreground-muted shrink-0" />
              </button>
              {comboOpen && (
                <div className="relative z-10 mt-1 rounded-md border border-border bg-surface shadow-md max-h-60 overflow-auto flex flex-col">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2 sticky top-0 bg-surface">
                    <Search className="w-4 h-4 text-foreground-muted shrink-0" />
                    <input
                      type="text"
                      value={query}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setComboOpen(false);
                        }
                      }}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="جستجوی پروژه…"
                      className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none"
                    />
                  </div>
                  <ul role="listbox" className="flex flex-col py-1">
                    {filtered.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-foreground-subtle">
                        پروژه‌ای یافت نشد.
                      </li>
                    ) : (
                      filtered.map((p) => (
                        <li key={p.projectId} role="option" aria-selected={selected?.projectId === p.projectId}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(p);
                              setComboOpen(false);
                              setQuery("");
                            }}
                            className={`w-full text-right px-3 py-2 text-sm hover:bg-surface-2 transition-colors ${
                              selected?.projectId === p.projectId
                                ? "text-brand-600 font-medium"
                                : "text-foreground"
                            }`}
                          >
                            {p.projectTitle}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
              {selected && (
                <p className="text-xs text-foreground-muted tabular-nums">
                  درصد سهم: {toPersianDigits(String(selected.sharePercent))}٪ | مبلغ سهم:{" "}
                  {tomanLabel(selected.shareAmount)} | مانده: {tomanLabel(selected.remaining)}
                </p>
              )}
            </div>

            <CurrencyInput
              label="مبلغ پرداخت"
              required
              value={amount}
              onChange={setAmount}
              hint="مبلغ به تومان وارد می‌شود."
              disabled={isPending || !selected}
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
              <label htmlFor="employee-payment-create-note" className="text-sm font-medium text-foreground">
                توضیحات
              </label>
              <textarea
                id="employee-payment-create-note"
                name="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="توضیحات اختیاری"
                disabled={isPending}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50 resize-y"
              />
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
