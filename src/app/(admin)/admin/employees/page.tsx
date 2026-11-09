import { redirect } from "next/navigation";
import { getSession } from "@/core/lib/auth";
import { listEmployeeBalances } from "@/modules/employee-payments/lib/service";
import { EmployeesListTable } from "@/modules/employee-payments/components/EmployeesListTable";

/**
 * /admin/employees — every employee with their share, paid amount and
 * outstanding remainder. The rows are fetched here (server) so the table is
 * populated in the SSR HTML; the client component hydrates and refreshes it.
 * The admin layout already enforces the ADMIN role.
 */
export default async function AdminEmployeesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await listEmployeeBalances({ sub: session.sub, role: session.role });
  return <EmployeesListTable employees={data.employees} basePath="/admin/employees" />;
}
