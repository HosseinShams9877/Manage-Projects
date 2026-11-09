"use client";

import { Plus, Trash2, Users } from "lucide-react";
import { Input } from "@/core/components/Input";
import { toPersianDigits } from "@/core/lib/format";
import type { AssignmentInput } from "../lib/schema";

export interface AssignableEmployee {
  id: string;
  name: string;
  email: string;
}

interface AssignmentEditorProps {
  employees: AssignableEmployee[];
  value: AssignmentInput[];
  onChange: (rows: AssignmentInput[]) => void;
  error?: string;
  disabled?: boolean;
}

export function AssignmentEditor({
  employees,
  value,
  onChange,
  error,
  disabled,
}: AssignmentEditorProps) {
  const total = value.reduce((acc, r) => acc + r.sharePercent, 0);
  const valid = total === 100;

  const addRow = () => {
    const used = new Set(value.map((r) => r.userId));
    const next = employees.find((e) => !used.has(e.id));
    if (!next) return;
    onChange([...value, { userId: next.id, sharePercent: 0 }]);
  };

  const updateRow = (index: number, patch: Partial<AssignmentInput>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const availableFor = (row: AssignmentInput) => [
    ...employees.filter((e) => !value.some((r) => r.userId === e.id)),
    ...employees.filter((e) => e.id === row.userId),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Users className="w-4 h-4" />
          سهم کارمندان
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={disabled || value.length >= employees.length}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:text-foreground-subtle disabled:pointer-events-none"
        >
          <Plus className="w-3.5 h-3.5" />
          افزودن کارمند
        </button>
      </div>

      <div
        className={`rounded-md border ${error ? "border-danger" : "border-border"} bg-surface-2/50 divide-y divide-border overflow-hidden`}
      >
        {value.length === 0 ? (
          <p className="px-3 py-4 text-xs text-foreground-subtle text-center">
            هیچ کارمندی اضافه نشده است. روی «افزودن کارمند» بزنید.
          </p>
        ) : (
          value.map((row, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5">
              <select
                aria-label="کارمند"
                disabled={disabled}
                value={row.userId}
                onChange={(e) => updateRow(i, { userId: e.target.value })}
                className="h-9 flex-1 min-w-0 rounded-md border border-border bg-surface px-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                {availableFor(row).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.email}
                  </option>
                ))}
              </select>
              <div className="w-28 shrink-0">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  disabled={disabled}
                  value={row.sharePercent}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    updateRow(i, {
                      sharePercent: Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n)),
                    });
                  }}
                  aria-label="درصد سهم"
                  className="h-9"
                />
              </div>
              <span className="text-xs text-foreground-muted shrink-0">٪</span>
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={disabled}
                className="p-1.5 rounded-md text-foreground-muted hover:text-danger hover:bg-danger-bg transition-colors shrink-0"
                aria-label="حذف ردیف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-2">
        <p
          className={`text-xs font-medium ${
            valid ? "text-success" : value.length === 0 ? "text-foreground-subtle" : "text-danger"
          }`}
        >
          {value.length === 0
            ? "مجموع: ۰"
            : valid
              ? `مجموع: ${toPersianDigits(total)} از ۱۰۰`
              : `مجموع: ${toPersianDigits(total)} از ۱۰۰ — باید دقیقاً ۱۰۰ شود`}
        </p>
        <p className="text-xs text-foreground-subtle">
          {toPersianDigits(value.length)} کارمند
        </p>
      </div>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
