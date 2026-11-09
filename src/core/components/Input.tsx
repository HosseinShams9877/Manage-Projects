"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  startIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, hint, startIcon, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative w-full">
          {startIcon && (
            <span className="absolute inset-y-0 right-3 flex items-center text-foreground-subtle pointer-events-none">
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-subtle transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50 disabled:bg-surface-2 ${
              startIcon ? "pr-9" : ""
            } ${error ? "border-danger focus:border-danger focus:ring-danger/30" : ""} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-foreground-subtle">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
