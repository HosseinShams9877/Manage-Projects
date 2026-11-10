import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/core/lib/auth";
import { APP_NAME } from "@/core/constants";
import { LogoutButton } from "@/modules/auth/components/LogoutButton";
import { NotificationBell } from "@/modules/notifications/components/NotificationBell";

const NAV = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/projects", label: "پروژه‌ها" },
  { href: "/admin/employees", label: "کارمندان" },
  { href: "/admin/employees/balances", label: "مانده حساب‌ها" },
  { href: "/admin/notifications", label: "اعلان‌ها" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/me");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-surface sticky top-0 z-10">
        <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">
              م
            </span>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">{APP_NAME}</h1>
              <p className="text-xs text-foreground-muted leading-tight">پنل مدیریت</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell
              allHref="/admin/notifications"
              projectHrefPrefix="/admin/projects"
            />
            <span className="text-sm text-foreground-muted hidden sm:inline mr-2">
              {session.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="w-full px-4 md:px-6 py-6 flex flex-col md:flex-row gap-6 flex-1">
        <nav className="md:w-56 shrink-0">
          <ul className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block px-4 py-2.5 rounded-md text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors whitespace-nowrap"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
