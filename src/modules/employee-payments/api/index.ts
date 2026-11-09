"use client";

import { api } from "@/core/lib/api-client";
import type {
  AssignedProjectDTO,
  EmployeeBalanceDTO,
  EmployeeBalancesDTO,
  EmployeePaymentDTO,
  EmployeePaymentFilter,
  EmployeePaymentFormValues,
  EmployeePaymentListDTO,
} from "../lib/schema";

/** Query-string filter shared by the list endpoint and its hooks. */
export function employeePaymentQuery(filter: EmployeePaymentFilter = {}): string {
  const params = new URLSearchParams();
  if (filter.userId) params.set("userId", filter.userId);
  if (filter.projectId) params.set("projectId", filter.projectId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchEmployeePayments(
  filter: EmployeePaymentFilter = {},
): Promise<EmployeePaymentListDTO> {
  return api.get(`/api/employee-payments${employeePaymentQuery(filter)}`);
}

export async function createEmployeePayment(
  values: EmployeePaymentFormValues,
): Promise<EmployeePaymentDTO> {
  return api.post("/api/employee-payments", values);
}

export async function updateEmployeePayment(
  id: string,
  values: Partial<EmployeePaymentFormValues>,
): Promise<EmployeePaymentDTO> {
  return api.patch(`/api/employee-payments/${id}`, values);
}

export async function deleteEmployeePayment(id: string): Promise<{ id: string }> {
  return api.del(`/api/employee-payments/${id}`);
}

/** All employees' balances (admin overview page). */
export async function fetchEmployeeBalances(): Promise<EmployeeBalancesDTO> {
  return api.get("/api/employees/balances");
}

/** One employee's balance (admin detail page, or the employee's own panel). */
export async function fetchEmployeeBalance(userId: string): Promise<EmployeeBalanceDTO> {
  return api.get(`/api/employees/${userId}/balance`);
}

/** One employee's assigned projects with share/remaining, TOMAN strings (fix-up). */
export async function fetchAssignedProjects(userId: string): Promise<AssignedProjectDTO[]> {
  return api.get(`/api/employees/${userId}/assigned-projects`);
}
