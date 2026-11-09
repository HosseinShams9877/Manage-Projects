import { notFound } from "next/navigation";
import { EmployeeDetailScreen } from "@/modules/employee-payments/components/EmployeeDetailScreen";

type Params = { params: Promise<{ id: string }> };

/**
 * /admin/employees/[id] — one employee: header, balance summary, per-project
 * breakdown and their payment history with create/edit/delete.
 * Note: the static `/admin/employees/balances` route wins over this dynamic
 * segment for that exact path (Next.js App Router precedence).
 */
export default async function AdminEmployeeDetailPage({ params }: Params) {
  const { id } = await params;
  if (!id) notFound();
  return <EmployeeDetailScreen id={id} canManage={true} />;
}
