"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { useNotifications, useUnreadCount } from "../hooks";
import { NotificationItem } from "./NotificationItem";

interface NotificationBellProps {
  /** Full-list page («/me/notifications» or «/admin/notifications»). */
  allHref: string;
  /** Link prefix for the related project. */
  projectHrefPrefix?: string;
}

/**
 * Bell with an unread badge. Opens a dropdown of the 5 latest notifications
 * on desktop; on mobile (< md) the same content becomes a full-screen sheet.
 */
export function NotificationBell({
  allHref,
  projectHrefPrefix = "/me/projects",
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: unread } = useUnreadCount();
  const count = unread?.count ?? 0;

  // The dropdown is capped at 5 rows; the full list lives on allHref.
  const { data, isLoading } = useNotifications({ limit: 5 });
  const notifications = data?.notifications ?? [];

  // Close on Escape; click-outside is handled by the fixed overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Close the popover whenever the full-list page is opened from it.
  const closeAndNavigate = () => setOpen(false);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid place-items-center w-10 h-10 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
        aria-label="اعلان‌ها"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute top-1 left-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-danger text-white text-[10px] font-bold tabular-nums leading-none">
            {count > 99 ? "۹۹+" : toFaDigits(count)}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away overlay: full-screen on mobile, transparent elsewhere. */}
          <div
            className="fixed inset-0 z-40 bg-black/30 md:bg-transparent"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Panel: full-screen sheet under md, anchored dropdown on md+. */}
          <div className="fixed inset-0 z-50 md:absolute md:inset-auto md:top-12 md:left-0 md:w-80 flex flex-col bg-surface md:border md:border-border md:rounded-lg md:shadow-lg">
            <div className="flex items-center justify-between gap-3 p-3 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">اعلان‌ها</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="md:hidden p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2"
                aria-label="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <p className="text-sm text-foreground-subtle text-center py-8">
                  در حال بارگذاری…
                </p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-foreground-subtle text-center py-10 px-4">
                  اعلان جدیدی ندارید.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <NotificationItem notification={n} projectHrefPrefix={projectHrefPrefix} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-2 border-t border-border">
              <a
                href={allHref}
                onClick={closeAndNavigate}
                className="block text-center text-sm font-medium text-brand-700 hover:text-brand-800 py-2 rounded-md hover:bg-surface-2 transition-colors"
              >
                مشاهده همه
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function toFaDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
