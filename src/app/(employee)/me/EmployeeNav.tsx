"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, Wallet, Bell } from "lucide-react";
import { useUnreadCount } from "@/modules/notifications/hooks";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { href: "/me", label: "داشبورد", icon: LayoutDashboard },
  { href: "/me/projects", label: "پروژه‌های من", icon: FolderKanban },
  { href: "/me/payments", label: "پرداخت‌های من", icon: Wallet },
  { href: "/me/notifications", label: "اعلان‌ها", icon: Bell },
];

/** Desktop top nav (md+) and mobile fixed bottom nav for the employee panel. */
export function EmployeeNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden md:block mb-6">
        <ul className="flex gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {href === "/me/notifications" && <UnreadBadge />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border">
        <ul className="flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                    active ? "text-brand-700" : "text-foreground-muted"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="relative">
                    <Icon className="w-5 h-5" />
                    {href === "/me/notifications" && <UnreadDot />}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/** Pill-shaped unread count for the desktop «اعلان‌ها» item. */
function UnreadBadge() {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;
  if (count === 0) return null;
  return (
    <span className="min-w-[20px] h-5 px-1.5 grid place-items-center rounded-full bg-danger text-white text-[11px] font-bold tabular-nums leading-none">
      {count > 99 ? "۹۹+" : toFaDigits(count)}
    </span>
  );
}

/** Dot badge for the mobile «اعلان‌ها» item. */
function UnreadDot() {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -left-2 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-danger text-white text-[10px] font-bold tabular-nums leading-none">
      {count > 99 ? "۹۹+" : toFaDigits(count)}
    </span>
  );
}

/** `/me` is exact; deeper routes are active under their own top section. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/me") return pathname === "/me";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function toFaDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
