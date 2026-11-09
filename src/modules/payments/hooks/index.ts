"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "@/core/constants";
import { persianToast } from "@/core/components/Toast";
import { invalidateProjectLedger } from "@/core/lib/query-cache";
import {
  createPayment as createPaymentApi,
  deletePayment as deletePaymentApi,
  fetchPayments,
  updatePayment as updatePaymentApi,
} from "../api";
import type { EmployerPaymentDTO, PaymentFormValues } from "../lib/schema";

/** Employer payments of one project. */
export function usePayments(projectId: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.payments.byProject(projectId),
    queryFn: () => fetchPayments(projectId),
    enabled: enabled && !!projectId,
  });
}

type MutationOptions<TData, TVars> = Omit<UseMutationOptions<TData, Error, TVars>, "mutationFn">;

/** Create an employer payment; invalidates the whole project ledger. */
export function useCreatePayment(
  projectId: string,
  options?: MutationOptions<EmployerPaymentDTO, PaymentFormValues>,
) {
  const queryClient = useQueryClient();
  return useMutation<EmployerPaymentDTO, Error, PaymentFormValues>({
    ...options,
    mutationFn: (values) => createPaymentApi(projectId, values),
    onSuccess: async (data, vars, ctx, context) => {
      await invalidateProjectLedger(queryClient, projectId);
      persianToast.success("پرداخت کارفرما ثبت شد.");
      options?.onSuccess?.(data, vars, ctx, context);
    },
    onError: (error, vars, ctx, context) => {
      persianToast.error(error.message || "ثبت پرداخت با خطا مواجه شد.");
      options?.onError?.(error, vars, ctx, context);
    },
  });
}

/** Patch payload: the payment id plus whichever fields changed. */
export type UpdatePaymentVars = { id: string } & Partial<PaymentFormValues>;

export function useUpdatePayment(
  projectId: string,
  options?: MutationOptions<EmployerPaymentDTO, UpdatePaymentVars>,
) {
  const queryClient = useQueryClient();
  return useMutation<EmployerPaymentDTO, Error, UpdatePaymentVars>({
    ...options,
    mutationFn: ({ id, ...values }) => updatePaymentApi(id, values),
    onSuccess: async (data, vars, ctx, context) => {
      await invalidateProjectLedger(queryClient, projectId);
      persianToast.success("پرداخت به‌روزرسانی شد.");
      options?.onSuccess?.(data, vars, ctx, context);
    },
    onError: (error, vars, ctx, context) => {
      persianToast.error(error.message || "به‌روزرسانی پرداخت با خطا مواجه شد.");
      options?.onError?.(error, vars, ctx, context);
    },
  });
}

export function useDeletePayment(
  projectId: string,
  options?: MutationOptions<{ id: string }, string>,
) {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    ...options,
    mutationFn: deletePaymentApi,
    onSuccess: async (data, vars, ctx, context) => {
      await invalidateProjectLedger(queryClient, projectId);
      persianToast.success("پرداخت حذف شد.");
      options?.onSuccess?.(data, vars, ctx, context);
    },
    onError: (error, vars, ctx, context) => {
      persianToast.error(error.message || "حذف پرداخت با خطا مواجه شد.");
      options?.onError?.(error, vars, ctx, context);
    },
  });
}
