import { redirect } from "next/navigation";
import { getSession } from "@/core/lib/auth";
import { Card } from "@/core/components/Card";
import { formatToman } from "@/core/lib/format";
import { listEmployeePayments } from "@/modules/employee-payments/lib/service";
import { EmployeePaymentTable } from "@/modules/employee-payments/components/EmployeePaymentTable";

/**
 * /me/payments — the employee's own payment history.
 * Server-rendered through listEmployeePayments, which locks an EMPLOYEE
 * session to session.sub, so only the signed-in user's payments are ever
 * fetched or rendered (the userId filter is ignored for employees).
 */
export default async function MyPaymentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EMPLOYEE") redirect("/admin");

  const { payments, total } = await listEmployeePayments(
    {},
    { sub: session.sub, role: session.role },
  );

  const totalReceived = payments.reduce((sum, p) => sum + BigInt(p.amount), 0n);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">پرداخت‌های من</h2>
        <p className="text-sm text-foreground-muted mt-1">
          تاریخچه پرداخت‌های دریافت‌شده شما از پروژه‌ها.
        </p>
      </div>

      <Card>
        <p className="text-xs text-foreground-muted">مجموع دریافتی</p>
        <p className="text-lg font-bold text-foreground mt-1.5 tabular-nums">
          {formatToman(totalReceived)}
        </p>
        <p className="text-xs text-foreground-muted mt-1 tabular-nums">{total} پرداخت</p>
      </Card>

      <Card title="تاریخچه پرداخت‌ها">
        <EmployeePaymentTable
          payments={payments}
          canManage={false}
          emptyText="پرداختی برای شما ثبت نشده است."
        />
      </Card>
    </div>
  );
}
