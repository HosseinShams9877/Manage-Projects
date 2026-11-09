"use client";

import { useRouter } from "next/navigation";
import { CreditCard, Bell } from "lucide-react";
import { useMarkRead } from "../hooks";
import { formatJalaliRelative } from "../lib/relative-time";
import type { NotificationDTO } from "../lib/schema";

interface NotificationItemProps {
  notification: NotificationDTO;
  /** Link prefix for the related project («/me/projects» or «/admin/projects»). */
  projectHrefPrefix?: string;
  /** Hide the relative timestamp (compact dropdown variant). */
  hideTime?: boolean;
}

const TYPE_ICON: Record<NotificationDTO["type"], React.ComponentType<{ className?: string }>> = {
  EMPLOYER_PAYMENT: CreditCard,
  SYSTEM: Bell,
};

/**
 * One notification row. Click marks it read (the hook marks it optimistically)
 * and navigates to the related project when the row carries a projectId.
 */
export function NotificationItem({
  notification,
  projectHrefPrefix = "/me/projects",
  hideTime = false,
}: NotificationItemProps) {
  const router = useRouter();
  const { mutateAsync: markRead, isPending } = useMarkRead();
  const Icon = TYPE_ICON[notification.type];
  const unread = !notification.readAt;

  const handleClick = async () => {
    if (unread) {
      try {
        await markRead(notification.id);
      } catch {
        // Persian toast already surfaced by the hook; navigation still allowed.
      }
    }
    if (notification.projectId) {
      router.push(`${projectHrefPrefix}/${notification.projectId}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="w-full flex items-start gap-3 rounded-lg p-3 text-right transition-colors hover:bg-surface-2 disabled:opacity-60"
    >
      <span
        className={`mt-0.5 grid place-items-center w-8 h-8 shrink-0 rounded-full border border-border ${
          unread ? "bg-brand-50 text-brand-700" : "bg-surface-2 text-foreground-muted"
        }`}
        aria-hidden
      >
        <Icon className="w-4 h-4" />
      </span>

      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span
          className={`text-sm leading-6 block ${
            unread ? "text-foreground font-medium" : "text-foreground-muted"
          }`}
        >
          {notification.message}
        </span>
        {!hideTime && (
          <span className="text-xs text-foreground-subtle tabular-nums">
            {formatJalaliRelative(notification.createdAt)}
          </span>
        )}
      </span>

      {unread && (
        <span
          className="mt-1.5 w-2.5 h-2.5 shrink-0 rounded-full bg-brand-500"
          aria-label="خوانده‌نشده"
        />
      )}
    </button>
  );
}
