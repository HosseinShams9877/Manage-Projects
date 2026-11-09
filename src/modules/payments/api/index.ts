"use client";

import { api } from "@/core/lib/api-client";
import type {
  EmployerPaymentDTO,
  EmployerPaymentListDTO,
  PaymentFormValues,
} from "../lib/schema";

export async function fetchPayments(projectId: string): Promise<EmployerPaymentListDTO> {
  return api.get(`/api/projects/${projectId}/payments`);
}

export async function createPayment(
  projectId: string,
  values: PaymentFormValues,
): Promise<EmployerPaymentDTO> {
  return api.post(`/api/projects/${projectId}/payments`, values);
}

export async function updatePayment(
  id: string,
  values: Partial<PaymentFormValues>,
): Promise<EmployerPaymentDTO> {
  return api.patch(`/api/payments/${id}`, values);
}

export async function deletePayment(id: string): Promise<{ id: string }> {
  return api.del(`/api/payments/${id}`);
}
