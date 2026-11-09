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
  bulkCreateInstallments as bulkCreateApi,
  createInstallment as createApi,
  deleteInstallment as deleteApi,
  fetchInstallments,
  recordPartialPayment as payApi,
  updateInstallment as updateApi,
  updateInstallmentDueDate as dueDateApi,
} from "../api";
import type {
  BulkInstallmentsInput,
  CreateInstallmentInput,
  InstallmentDTO,
  InstallmentListDTO,
  PartialPaymentInput,
  UpdateDueDateInput,
  UpdateInstallmentInput,
} from "../lib/schema";

/** Installment plan + debt snapshot of one project. */
export function useInstallments(projectId: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.installments.byProject(projectId),
    queryFn: () => fetchInstallments(projectId),
    enabled: enabled && !!projectId,
  });
}

type MutationOptions<TData, TVars> = Omit<UseMutationOptions<TData, Error, TVars>, "mutationFn">;

function useLedgerMutation<TData, TVars>(
  projectId: string,
  mutationFn: (vars: TVars) => Promise<TData>,
  successMessage: string,
  errorMessage: string,
  options?: MutationOptions<TData, TVars>,
) {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVars>({
    ...options,
    mutationFn,
    onSuccess: async (data, vars, ctx, context) => {
      await invalidateProjectLedger(queryClient, projectId);
      persianToast.success(successMessage);
      options?.onSuccess?.(data, vars, ctx, context);
    },
    onError: (error, vars, ctx, context) => {
      persianToast.error(error.message || errorMessage);
      options?.onError?.(error, vars, ctx, context);
    },
  });
}

export function useCreateInstallment(
  projectId: string,
  options?: MutationOptions<InstallmentDTO, CreateInstallmentInput>,
) {
  return useLedgerMutation(
    projectId,
    (values) => createApi(projectId, values),
    "قسط جدید ثبت شد.",
    "ثبت قسط با خطا مواجه شد.",
    options,
  );
}

export function useBulkCreateInstallments(
  projectId: string,
  options?: MutationOptions<InstallmentListDTO, BulkInstallmentsInput>,
) {
  return useLedgerMutation(
    projectId,
    (values) => bulkCreateApi(projectId, values),
    "اقساط دوره‌ای ثبت شدند.",
    "ثبت اقساط با خطا مواجه شد.",
    options,
  );
}

/** Patch payload: the installment id plus whichever fields changed. */
export type UpdateInstallmentVars = { id: string } & Omit<UpdateInstallmentInput, "id">;

export function useUpdateInstallment(
  projectId: string,
  options?: MutationOptions<InstallmentDTO, UpdateInstallmentVars>,
) {
  return useLedgerMutation<InstallmentDTO, UpdateInstallmentVars>(
    projectId,
    ({ id, ...values }) => updateApi(id, values),
    "قسط به‌روزرسانی شد.",
    "به‌روزرسانی قسط با خطا مواجه شد.",
    options,
  );
}

export function useUpdateInstallmentDueDate(
  projectId: string,
  options?: MutationOptions<InstallmentDTO, UpdateDueDateInput>,
) {
  return useLedgerMutation(
    projectId,
    ({ id, ...values }) => dueDateApi(id, values),
    "سررسید قسط تغییر کرد.",
    "تغییر سررسید با خطا مواجه شد.",
    options,
  );
}

/** Pay payload: the installment id plus the payment details. */
export type PartialPaymentVars = { installmentId: string } & Omit<PartialPaymentInput, "installmentId">;

export function useRecordPartialPayment(
  projectId: string,
  options?: MutationOptions<InstallmentDTO, PartialPaymentVars>,
) {
  return useLedgerMutation(
    projectId,
    ({ installmentId, ...values }) => payApi(installmentId, values),
    "پرداخت قسط ثبت شد.",
    "ثبت پرداخت قسط با خطا مواجه شد.",
    options,
  );
}

export function useDeleteInstallment(
  projectId: string,
  options?: MutationOptions<{ id: string }, string>,
) {
  return useLedgerMutation(
    projectId,
    (id) => deleteApi(id),
    "قسط حذف شد.",
    "حذف قسط با خطا مواجه شد.",
    options,
  );
}
