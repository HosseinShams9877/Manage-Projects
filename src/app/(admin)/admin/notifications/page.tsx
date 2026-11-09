import { redirect } from "next/navigation";
import { getSession } from "@/core/lib/auth";
import { NotificationList } from "@/modules/notifications/components/NotificationList";

/**
 * /admin/notifications — the admin's own notifications. In this system
 * notifications are addressed to the employees assigned to a project, so an
 * admin's list is empty by design; the note explains that.
 */
export default async function AdminNotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/me");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">اعلان‌ها</h2>
        <p className="text-sm text-foreground-muted mt-1">اعلان‌های شما</p>
      </div>
      <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
        <p className="text-sm text-foreground-muted">
          اعلان‌ها برای کارمندان اختصاص‌یافته به پروژه‌ها ارسال می‌شود.
        </p>
      </div>
      <NotificationList />
    </div>
  );
}
