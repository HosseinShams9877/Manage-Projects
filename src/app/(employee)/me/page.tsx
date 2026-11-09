import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CreditCard, Wallet, FolderKanban, CalendarClock } from "lucide-react";
import { getSession } from "@/core/lib/auth";
import { Card } from "@/core/components/Card";
import { Badge } from "@/core/components/Badge";
import { EmptyState } from "@/core/components/EmptyState";
import { ProgressBar } from "@/core/components/ProgressBar";
import { formatJalali, formatToman, toPersianDigits } from "@/core/lib/format";
import { INSTALLMENT_STATUS } from "@/core/constants";
import {
  getEmployeeBalance,
  listEmployeePayments,
} from "@/modules/employee-payments/lib/service";
import { listForUser } from "@/modules/notifications/lib/service";
import { formatJalaliRelative } from "@/modules/notifications/lib/relative-time";
import { getEmployeeDashboardStats } from "@/modules/dashboard/lib/service";

/**
 * /me — employee dashboard: aggregate share/received/remaining cards, the
 * employee's own projects (progress bar is over MY share only), and the latest
 * notifications + payments. Everything is scoped to session.sub in the service
 * layer, so no other user's data can reach this page.
 */
export default async function EmployeeMePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EMPLOYEE") redirect("/admin");

  const employeeSession = { sub: session.sub, role: session.role };

  const [balance, notifications, payments, dashboard] = await Promise.all([
    getEmployeeBalance(session.sub, employeeSession),
    listForUser(session.sub, { limit: 5 }),
    listEmployeePayments({}, employeeSession),
    getEmployeeDashboardStats(session.sub, employeeSession),
  ]);

  const recentPayments = payments.payments.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">داشبورد</h2>
        <p className="text-sm text-foreground-muted mt-1">
          خلاصه سهم شما از پروژه‌ها، پرداخت‌های دریافت‌شده و اعلان‌های اخیر.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-2 text-foreground-muted">
            <FolderKanban className="w-4 h-4" />
            <p className="text-xs">مجموع سهم من</p>
          </div>
          <p className="text-lg font-bold text-foreground mt-1.5 tabular-nums">
            {formatToman(balance.totalShare)}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-foreground-muted">
            <Wallet className="w-4 h-4" />
            <p className="text-xs">مجموع دریافتی</p>
          </div>
          <p className="text-lg font-bold text-foreground mt-1.5 tabular-nums">
            {formatToman(balance.totalPaid)}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-foreground-muted">
            <CreditCard className="w-4 h-4" />
            <p className="text-xs">مانده حساب من</p>
          </div>
          <p className="text-lg font-bold text-foreground mt-1.5 tabular-nums">
            {formatToman(balance.totalRemaining)}
          </p>
        </Card>
        {/* §2 — received this Jalali month */}
        <Card>
          <div className="flex items-center gap-2 text-foreground-muted">
            <Wallet className="w-4 h-4" />
            <p className="text-xs">دریافتی این ماه</p>
          </div>
          <p className="text-lg font-bold text-foreground mt-1.5 tabular-nums">
            {formatToman(dashboard.receivedThisMonth)}
          </p>
          {dashboard.currentMonthLabel ? (
            <p className="text-xs text-foreground-subtle mt-1 tabular-nums">
              {dashboard.currentMonthLabel}
            </p>
          ) : null}
        </Card>
      </div>

      {/* My projects — the progress bar is over MY share only */}
      <Card title="پروژه‌های من" description="سهم شما از هر پروژه و وضعیت تسویه آن.">
        {balance.projects.length === 0 ? (
          <p className="text-sm text-foreground-muted py-2">
            شما به هیچ پروژه‌ای اختصاص نیافته‌اید.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {balance.projects.map((p) => (
              <div
                key={p.projectId}
                className="rounded-lg border border-border bg-background p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/me/projects/${p.projectId}`}
                    className="text-sm font-medium text-foreground hover:text-brand-700"
                  >
                    {p.title}
                  </Link>
                  <span className="text-xs text-foreground-muted tabular-nums">
                    سهم {toPersianDigits(p.sharePercent)}٪
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-foreground-muted">مبلغ سهم</span>
                  <span className="tabular-nums text-foreground">
                    {formatToman(p.shareAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-foreground-muted">دریافتی</span>
                  <span className="tabular-nums text-foreground">{formatToman(p.paid)}</span>
                </div>
                <ProgressBar value={BigInt(p.paid)} total={BigInt(p.shareAmount)} />
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-foreground-muted">مانده</span>
                  <Badge tone={BigInt(p.remaining) <= 0n ? "success" : "warning"}>
                    <span className="tabular-nums">{formatToman(p.remaining)}</span>
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* §2 — upcoming installments on MY projects (read-only) */}
      <Card
        title="اقساط پیش‌رو"
        description="اقساط برنامه‌ریزی‌شده پروژه‌های شما — ثبت وصول توسط مدیر انجام می‌شود."
        actions={<CalendarClock className="w-4 h-4 text-foreground-muted" aria-hidden />}
      >
        {dashboard.upcomingInstallments.length === 0 ? (
          <EmptyState
            message="اقساط پیش‌روی برای پروژه‌های شما وجود ندارد."
            hint="اقساط سررسیدآینده اینجا نمایش داده می‌شوند."
          />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {dashboard.upcomingInstallments.map((i) => (
              <div
                key={i.id}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <span className="flex-1 min-w-0 flex flex-col">
                  <Link
                    href={`/me/projects/${i.projectId}`}
                    className="text-sm font-medium text-foreground truncate hover:text-brand-700"
                  >
                    {i.projectTitle}
                  </Link>
                  <span className="text-xs text-foreground-subtle tabular-nums">
                    {i.jalaliDueDate}
                  </span>
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-foreground-muted tabular-nums">
                    مانده {formatToman(i.remaining)}
                  </span>
                  <Badge tone={i.status === "PARTIAL" ? "warning" : "neutral"}>
                    {INSTALLMENT_STATUS[i.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent notifications */}
        <Card title="اعلان‌های اخیر">
          {notifications.notifications.length === 0 ? (
            <p className="text-sm text-foreground-muted py-2">اعلان جدیدی ندارید.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {notifications.notifications.map((n) => (
                <li key={n.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link
                    href={
                      n.projectId ? `/me/projects/${n.projectId}` : "/me/notifications"
                    }
                    className="flex items-start gap-2.5 text-right"
                  >
                    <span
                      className={`mt-0.5 w-2 h-2 shrink-0 rounded-full ${
                        n.readAt ? "bg-transparent" : "bg-brand-500"
                      }`}
                      aria-hidden
                    />
                    <span className="flex-1 min-w-0">
                      <span
                        className={`block text-sm leading-6 ${
                          n.readAt ? "text-foreground-muted" : "text-foreground font-medium"
                        }`}
                      >
                        {n.message}
                      </span>
                      <span className="block text-xs text-foreground-subtle tabular-nums">
                        {formatJalaliRelative(n.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 pt-3 border-t border-border">
            <Link
              href="/me/notifications"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              <Bell className="w-4 h-4" />
              مشاهده همه اعلان‌ها
            </Link>
          </div>
        </Card>

        {/* Recent payments */}
        <Card title="پرداخت‌های اخیر">
          {recentPayments.length === 0 ? (
            <p className="text-sm text-foreground-muted py-2">
              هنوز پرداختی به شما ثبت نشده است.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentPayments.map((p) => (
                <li
                  key={p.id}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-sm font-medium text-foreground truncate">
                      {p.projectTitle}
                    </span>
                    <span className="text-xs text-foreground-subtle tabular-nums">
                      {formatJalali(p.jalaliDate)}
                    </span>
                  </span>
                  <span className="text-sm font-medium text-success tabular-nums whitespace-nowrap">
                    {formatToman(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 pt-3 border-t border-border">
            <Link
              href="/me/payments"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              <Wallet className="w-4 h-4" />
              مشاهده همه پرداخت‌ها
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
