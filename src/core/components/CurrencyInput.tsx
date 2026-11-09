"use client";

import { forwardRef, useEffect, useState } from "react";
import { withSeparators, toPersianDigits, toEnglishDigits } from "@/core/lib/format";

interface CurrencyInputProps {
  /** Current value as a plain (unseparated, ASCII) string, e.g. "100000000". */
  value?: string;
  /** Emits the plain ASCII digit string, or "" when cleared. */
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Money input for TOMAN amounts: shows thousand-separated Persian digits while
 * typing, always emits a plain ASCII digit string (bigint-safe). The component
 * is controlled on the raw string so the parent can hand it straight to the API.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value = "",
      onChange,
      label,
      error,
      hint,
      placeholder = "مبلغ به تومان",
      id,
      name,
      disabled,
      required,
    },
    ref,
  ) => {
    const [display, setDisplay] = useState(() => (value ? formatForDisplay(value) : ""));

    // Keep the visible text in sync if the parent rewrites the value (e.g. reset).
    useEffect(() => {
      const plain = toEnglishDigits(display).replace(/[,\s٬]/g, "");
      if (plain !== value) {
        setDisplay(value ? formatForDisplay(value) : "");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const plain = toEnglishDigits(raw).replace(/[^\d]/g, "");
      setDisplay(plain ? formatForDisplay(plain) : "");
      onChange(plain);
    };

    const inputId = id ?? name;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={display}
          onChange={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground text-right tabular-nums transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50 disabled:bg-surface-2 ${
            error ? "border-danger focus:border-danger focus:ring-danger/30" : ""
          }`}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-foreground-subtle">{hint}</p>}
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

function formatForDisplay(plainDigits: string): string {
  return toPersianDigits(withSeparators(plainDigits));
}
