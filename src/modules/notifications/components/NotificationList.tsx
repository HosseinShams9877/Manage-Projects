"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { useMarkAllRead, useNotifications } from "../hooks";
import { NotificationItem } from "./NotificationItem";

/**
 * Full notification list with «همه / خوانده‌نشده» tabs and a bulk mark-read
 * action. Rendered on /me/notifications and /admin/notifications.
 */
export function NotificationList() {
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading, isFetching } = useNotifications({ unreadOnly });
  const { mutateAsync: markAllRead, isPending: markingAll } = useMarkAllRead();

  const notifications = data?.notifications ?? [];
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tabs */}
        <div
          role="tablist"
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-surface-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !unreadOnly
                ? "bg-surface text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            همه
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={unreadOnly}
            onClick={() => setUnreadOnly(true)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              unreadOnly
                ? "bg-surface text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            خوانده‌نشده
          </button>
        </div>

        <button
          type="button"
          onClick={() => markAllRead()}
          disabled={markingAll || !hasUnread}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-brand-700 border border-brand-200 hover:bg-brand-50 disabled:text-foreground-subtle disabled:border-border disabled:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          <CheckCheck className="w-4 h-4" />
          همه را خوانده کن
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-foreground-subtle text-center py-10">
          در حال بارگذاری…
        </p>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-sm text-foreground-muted">
            {unreadOnly ? "همه اعلان‌ها خوانده‌شده‌اند." : "اعلانی وجود ندارد."}
          </span>
        </div>
      ) : (
        <>
          {isFetching && (
            <p className="text-xs text-foreground-subtle">در حال به‌روزرسانی…</p>
          )}
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface overflow-hidden">
            {notifications.map((n) => (
              <li key={n.id}>
                <NotificationItem notification={n} />
              </li>
            ))}
          </ul>
          {data?.total != null && (
            <p className="text-xs text-foreground-subtle text-left tabular-nums">
              {toFaDigits(data.total)} اعلان
            </p>
          )}
        </>
      )}
    </div>
  );
}

function toFaDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
