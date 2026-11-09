/**
 * EmptyState — consistent Persian empty placeholders (Phase 6 §3b).
 * Centered, muted, icon-first; every list in the app renders one of these
 * instead of a bare «رکوردی یافت نشد.».
 */

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  /** Short Persian sentence, e.g. «هنوز پروژه‌ای ثبت نشده است.» */
  message: string;
  /** Optional second line of guidance. */
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({ message, hint, icon: Icon = Inbox, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-10 text-center ${className}`}
      role="status"
    >
      <Icon className="w-8 h-8 text-foreground-subtle" aria-hidden />
      <p className="text-sm font-medium text-foreground-muted">{message}</p>
      {hint ? <p className="text-xs text-foreground-subtle">{hint}</p> : null}
    </div>
  );
}
