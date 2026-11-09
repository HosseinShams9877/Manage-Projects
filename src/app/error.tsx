"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

/**
 * Global Persian error boundary (Phase 6 §4). Catches render errors
 * anywhere in the app and offers a hard reload (the only safe recovery for
 * a corrupt client state — route-level query failures use ErrorState).
 */

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Surface the digest server-side for debugging without rendering it raw.
    console.error("خطای رندر:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-lg border border-border bg-surface shadow-sm p-8 flex flex-col items-center text-center gap-4">
        <AlertTriangle className="w-12 h-12 text-danger" aria-hidden />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-foreground">خطایی رخ داد</h1>
          <p className="text-sm text-foreground-muted leading-6">
            بارگذاری این بخش با مشکل مواجه شد. لطفاً دوباره تلاش کنید؛ اگر مشکل ادامه داشت، صفحه را بازخوانی کنید.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <RefreshCw className="w-4 h-4" />
            تلاش مجدد
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            بازگشت
          </button>
        </div>
      </div>
    </div>
  );
}
