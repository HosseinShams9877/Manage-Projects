"use client";

import { useMemo } from "react";
import {
  JALALI_MONTHS,
  currentJalaliYear,
  isoToJalaliParts,
  jalaliToISO,
  toPersianDigits,
} from "@/core/lib/format";

interface JalaliDatePickerProps {
  /** Current value as ISO date string, or empty. */
  value?: string | null;
  /** Emits ISO date string or null when cleared. */
  onChange: (iso: string | null) => void;
  label?: string;
  error?: string;
  minYear?: number;
  maxYear?: number;
  required?: boolean;
  id?: string;
  disabled?: boolean;
}

/** Number of days in a Jalali month (Esfand capped at 29 to stay safe across leap years). */
function daysInJalaliMonth(jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return 29;
}

export function JalaliDatePicker({
  value,
  onChange,
  label,
  error,
  minYear,
  maxYear,
  required,
  id,
  disabled,
}: JalaliDatePickerProps) {
  const nowYear = currentJalaliYear();
  const yearMin = minYear ?? nowYear - 5;
  const yearMax = maxYear ?? nowYear + 10;

  const parts = useMemo(() => isoToJalaliParts(value), [value]);
  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = yearMax; y >= yearMin; y--) out.push(y);
    return out;
  }, [yearMin, yearMax]);

  const dayCount = parts ? daysInJalaliMonth(parts.jm) : 31;

  const handleChange = (base: { jy: number; jm: number; jd: number }, overrides?: Partial<{ jy: number; jm: number; jd: number }>) => {
    const next = { ...base, ...overrides };
    const cap = Math.min(next.jd, daysInJalaliMonth(next.jm));
    const iso = jalaliToISO(next.jy, next.jm, cap);
    if (iso === null) return;
    onChange(iso);
  };

  const selectClass = `h-10 rounded-md border border-border bg-surface px-2 text-sm text-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 ${
    error ? "border-danger" : ""
  }`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div id={id} className="flex gap-2">
        <select
          aria-label="روز"
          disabled={disabled}
          className={`${selectClass} w-20`}
          value={parts?.jd ?? ""}
          onChange={(e) => parts && handleChange({ ...parts, jd: Number(e.target.value) })}
        >
          <option value="" disabled>
            روز
          </option>
          {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {toPersianDigits(d)}
            </option>
          ))}
        </select>
        <select
          aria-label="ماه"
          disabled={disabled}
          className={`${selectClass} w-28`}
          value={parts?.jm ?? ""}
          onChange={(e) => {
            const jm = Number(e.target.value);
            handleChange(parts ?? { jy: nowYear, jm: 1, jd: 1 }, { jm });
          }}
        >
          <option value="" disabled>
            ماه
          </option>
          {JALALI_MONTHS.map((name, i) => (
            <option key={i + 1} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="سال"
          disabled={disabled}
          className={`${selectClass} w-24`}
          value={parts?.jy ?? ""}
          onChange={(e) => {
            const jy = Number(e.target.value);
            handleChange(parts ?? { jy: nowYear, jm: 1, jd: 1 }, { jy });
          }}
        >
          <option value="" disabled>
            سال
          </option>
          {years.map((y) => (
            <option key={y} value={y}>
              {toPersianDigits(y)}
            </option>
          ))}
        </select>
      </div>
      {parts && (
        <span className="text-xs text-foreground-subtle">
          {toPersianDigits(`${parts.jy}/${String(parts.jm).padStart(2, "0")}/${String(parts.jd).padStart(2, "0")}`)}
        </span>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
