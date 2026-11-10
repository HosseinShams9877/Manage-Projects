import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/core/lib/auth";
import { LogoutButton } from "@/modules/auth/components/LogoutButton";
import { NotificationBell } from "@/modules/notifications/components/NotificationBell";
import { EmployeeNav } from "./EmployeeNav";

export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EMPLOYEE") redirect("/admin");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-surface sticky top-0 z-10">
        <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">
              م
            </span>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">پنل کارمند</h1>
              <p className="text-xs text-foreground-muted leading-tight">{session.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell allHref="/me/notifications" projectHrefPrefix="/me/projects" />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="w-full px-4 md:px-6 py-6 flex-1 pb-20 md:pb-6 min-w-0">
        <EmployeeNav />
        {children}
      </main>
    </div>
  );
}
