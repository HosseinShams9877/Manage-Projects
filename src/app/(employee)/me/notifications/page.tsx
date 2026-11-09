import { redirect } from "next/navigation";
import { getSession } from "@/core/lib/auth";
import { NotificationList } from "@/modules/notifications/components/NotificationList";

/** /me/notifications — the employee's full, filterable notification list. */
export default async function MyNotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EMPLOYEE") redirect("/admin");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">اعلان‌ها</h2>
        <p className="text-sm text-foreground-muted mt-1">
          همه اعلان‌های شما؛ موارد خوانده‌نشده با نقطه مشخص می‌شوند.
        </p>
      </div>
      <NotificationList />
    </div>
  );
}
