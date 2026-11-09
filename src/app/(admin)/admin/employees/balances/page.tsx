import { EmployeeBalancesScreen } from "@/modules/employee-payments/components/EmployeeBalancesScreen";

/**
 * /admin/employees/balances — admin overview of every employee's aggregate
 * share, paid amount and remainder, sortable by remainder.
 * This static segment takes precedence over /admin/employees/[id].
 */
export default function AdminEmployeeBalancesPage() {
  return <EmployeeBalancesScreen basePath="/admin/employees" />;
}
