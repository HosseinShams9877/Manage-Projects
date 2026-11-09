"use client";

import { api } from "@/core/lib/api-client";
import type {
  BulkInstallmentsInput,
  CreateInstallmentInput,
  InstallmentDTO,
  InstallmentListDTO,
  PartialPaymentInput,
  UpdateDueDateInput,
  UpdateInstallmentInput,
} from "../lib/schema";

export async function fetchInstallments(projectId: string): Promise<InstallmentListDTO> {
  return api.get(`/api/projects/${projectId}/installments`);
}

export async function createInstallment(
  projectId: string,
  values: CreateInstallmentInput,
): Promise<InstallmentDTO> {
  return api.post(`/api/projects/${projectId}/installments`, values);
}

export async function bulkCreateInstallments(
  projectId: string,
  values: BulkInstallmentsInput,
): Promise<InstallmentListDTO> {
  return api.post(`/api/projects/${projectId}/installments?mode=bulk`, values);
}

export async function updateInstallment(
  id: string,
  values: Omit<UpdateInstallmentInput, "id">,
): Promise<InstallmentDTO> {
  return api.patch(`/api/installments/${id}`, values);
}

export async function deleteInstallment(id: string): Promise<{ id: string }> {
  return api.del(`/api/installments/${id}`);
}

export async function recordPartialPayment(
  installmentId: string,
  values: Omit<PartialPaymentInput, "installmentId">,
): Promise<InstallmentDTO> {
  return api.post(`/api/installments/${installmentId}/pay`, values);
}

export async function updateInstallmentDueDate(
  installmentId: string,
  values: Omit<UpdateDueDateInput, "id">,
): Promise<InstallmentDTO> {
  return api.patch(`/api/installments/${installmentId}/due-date`, values);
}
