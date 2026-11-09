import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/lib/auth";
import {
  getEmployeeBalance,
  listEmployeePayments,
} from "@/modules/employee-payments/lib/service";
import { EmployeeDetailScreen } from "@/modules/employee-payments/components/EmployeeDetailScreen";

type Params = { params: Promise<{ id: string }> };

/**
 * /admin/employees/[id] — one employee: header, balance summary, per-project
 * breakdown and their payment history with create/edit/delete.
 * Note: the static `/admin/employees/balances` route wins over this dynamic
 * segment for that exact path (Next.js App Router precedence).
 *
 * Balance and payments are fetched here so the detail page is fully rendered
 * in the SSR HTML; the client screen hydrates with the same data.
 */
export default async function AdminEmployeeDetailPage({ params }: Params) {
  const { id } = await params;
  if (!id) notFound();

  const session = await getSession();
  if (!session) redirect("/login");

  const [balance, payments] = await Promise.all([
    getEmployeeBalance(id, { sub: session.sub, role: session.role }),
    listEmployeePayments({ userId: id }, { sub: session.sub, role: session.role }),
  ]);

  return (
    <EmployeeDetailScreen
      id={id}
      canManage={true}
      initialBalance={balance}
      initialPayments={payments}
    />
  );
}
