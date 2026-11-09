"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "@/core/constants";
import { persianToast } from "@/core/components/Toast";
import { invalidateEmployeeLedger } from "@/core/lib/query-cache";
import {
  createEmployeePayment as createEmployeePaymentApi,
  deleteEmployeePayment as deleteEmployeePaymentApi,
  fetchAssignedProjects,
  fetchEmployeeBalance,
  fetchEmployeeBalances,
  fetchEmployeePayments,
  updateEmployeePayment as updateEmployeePaymentApi,
} from "../api";
import type {
  AssignedProjectDTO,
  EmployeeBalanceDTO,
  EmployeeBalancesDTO,
  EmployeePaymentDTO,
  EmployeePaymentFilter,
  EmployeePaymentFormValues,
  EmployeePaymentListDTO,
} from "../lib/schema";

type MutationOptions<TData, TVars> = Omit<UseMutationOptions<TData, Error, TVars>, "mutationFn">;

/** Employee payments, optionally narrowed by user and/or project. */
export function useEmployeePayments(
  filter: EmployeePaymentFilter = {},
  initialData?: EmployeePaymentListDTO,
) {
  // Both filters set → a dedicated key; prefix invalidation still matches it.
  const queryKey =
    filter.userId && filter.projectId
      ? (["employee-payments", "user", filter.userId, "project", filter.projectId] as const)
      : filter.userId
        ? QUERY_KEYS.employeePayments.byUser(filter.userId)
        : filter.projectId
          ? QUERY_KEYS.employeePayments.byProject(filter.projectId)
          : QUERY_KEYS.employeePayments.all;

  return useQuery({
    queryKey,
    queryFn: () => fetchEmployeePayments(filter),
    initialData,
  });
}

/** Balances of every employee (admin overview). */
export function useEmployeeBalances(initialData?: EmployeeBalancesDTO) {
  return useQuery({
    queryKey: QUERY_KEYS.employees.balances,
    queryFn: fetchEmployeeBalances,
    initialData,
  });
}

/** Balance of one employee (admin detail page / own panel). */
export function useEmployeeBalance(
  userId: string,
  enabled = true,
  initialData?: EmployeeBalanceDTO,
) {
  return useQuery({
    queryKey: QUERY_KEYS.employees.detail(userId),
    queryFn: () => fetchEmployeeBalance(userId),
    enabled: enabled && !!userId,
    initialData,
  });
}

/** Projects one employee is assigned to, with their share and remaining (fix-up). */
export function useEmployeeAssignedProjects(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.employeePayments.assignedProjects(userId),
    queryFn: () => fetchAssignedProjects(userId),
    enabled: !!userId,
  });
}

/**
 * Create an employee payment; invalidates that employee's whole ledger.
 * `successMessage` overrides the default Persian toast (fix-up: the new
 * dialogs address the employee by name).
 */
export function useCreateEmployeePayment(
  options?: MutationOptions<EmployeePaymentDTO, EmployeePaymentFormValues> & {
    successMessage?: string;
  },
) {
  const queryClient = useQueryClient();
  return useMutation<EmployeePaymentDTO, Error, EmployeePaymentFormValues>({
    ...options,
    mutationFn: (values) => createEmployeePaymentApi(values),
    onSuccess: async (data, vars, ctx, context) => {
      await invalidateEmployeeLedger(queryClient, vars.userId);
      persianToast.success(options?.successMessage ?? "پرداخت کارمند ثبت شد.");
      options?.onSuccess?.(data, vars, ctx, context);
    },
    onError: (error, vars, ctx, context) => {
      persianToast.error(error.message || "ثبت پرداخت با خطا مواجه شد.");
      options?.onError?.(error, vars, ctx, context);
    },
  });
}

/** Patch payload: the payment id plus whichever fields changed. */
export type UpdateEmployeePaymentVars = { id: string } & Partial<EmployeePaymentFormValues>;

export function useUpdateEmployeePayment(
  options?: MutationOptions<EmployeePaymentDTO, UpdateEmployeePaymentVars>,
) {
  const queryClient = useQueryClient();
  return useMutation<EmployeePaymentDTO, Error, UpdateEmployeePaymentVars>({
    ...options,
    mutationFn: ({ id, ...values }) => updateEmployeePaymentApi(id, values),
    onSuccess: async (data, vars, ctx, context) => {
      await invalidateEmployeeLedger(queryClient, data.userId);
      persianToast.success("پرداخت به‌روزرسانی شد.");
      options?.onSuccess?.(data, vars, ctx, context);
    },
    onError: (error, vars, ctx, context) => {
      persianToast.error(error.message || "به‌روزرسانی پرداخت با خطا مواجه شد.");
      options?.onError?.(error, vars, ctx, context);
    },
  });
}

/** Takes the full payment (its userId drives the invalidation). */
export function useDeleteEmployeePayment(
  options?: MutationOptions<{ id: string }, EmployeePaymentDTO>,
) {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, EmployeePaymentDTO>({
    ...options,
    mutationFn: (payment) => deleteEmployeePaymentApi(payment.id),
    onSuccess: async (data, payment, ctx, context) => {
      await invalidateEmployeeLedger(queryClient, payment.userId);
      persianToast.success("پرداخت حذف شد.");
      options?.onSuccess?.(data, payment, ctx, context);
    },
    onError: (error, payment, ctx, context) => {
      persianToast.error(error.message || "حذف پرداخت با خطا مواجه شد.");
      options?.onError?.(error, payment, ctx, context);
    },
  });
}

export type { EmployeePaymentFilter, EmployeePaymentListDTO };
export type { EmployeeBalanceDTO, EmployeeBalancesDTO };
