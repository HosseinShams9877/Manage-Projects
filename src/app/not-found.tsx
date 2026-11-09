import Link from "next/link";
import { Home, Frown } from "lucide-react";
import { APP_NAME } from "@/core/constants";

/**
 * Persian 404 page (Phase 6 §4). Rendered by Next for any unmatched route —
 * including the API-less catch-all under both role layouts.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-lg border border-border bg-surface shadow-sm p-8 flex flex-col items-center text-center gap-4">
        <Frown className="w-12 h-12 text-foreground-subtle" aria-hidden />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-foreground">صفحه‌ای که دنبالش بودید پیدا نشد</h1>
          <p className="text-sm text-foreground-muted leading-6">
            ممکن است آدرس اشتباه باشد یا صفحه جابه‌جا شده باشد. به داشبورد {APP_NAME} بازگردید.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Home className="w-4 h-4" />
          بازگشت به داشبورد
        </Link>
      </div>
    </div>
  );
}
