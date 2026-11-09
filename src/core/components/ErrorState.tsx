"use client";

/**
 * ErrorState — inline Persian error block with a retry button (Phase 6 §3c).
 * Use inside query consumers; the global error.tsx boundary catches render
 * errors, this one handles failed fetches.
 */

import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  /** What failed, e.g. «بارگذاری داشبورد». */
  title?: string;
  /** Optional error message from the query (shown muted). */
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "بارگذاری ناموفق بود",
  message,
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-10 text-center ${className}`}
      role="alert"
    >
      <AlertCircle className="w-8 h-8 text-danger" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {message ? (
          <p className="text-xs text-foreground-subtle max-w-md">{message}</p>
        ) : null}
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-surface-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          تلاش مجدد
        </button>
      ) : null}
    </div>
  );
}
