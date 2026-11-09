import { EmployeeListScreen } from "@/modules/employee-payments/components/EmployeeListScreen";

/**
 * /admin/employees — every employee with their role, project count and
 * outstanding remainder. The admin layout already enforces the ADMIN role.
 */
export default function AdminEmployeesPage() {
  return <EmployeeListScreen basePath="/admin/employees" />;
}
