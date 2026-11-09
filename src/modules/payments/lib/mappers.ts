import type { EmployerPayment } from "@prisma/client";
import type { EmployerPaymentDTO } from "./schema";

export function mapPaymentToDTO(p: EmployerPayment): EmployerPaymentDTO {
  return {
    id: p.id,
    projectId: p.projectId,
    amount: p.amount.toString(),
    jalaliDate: p.date.toISOString(),
    note: p.note,
    createdAt: p.createdAt.toISOString(),
    // No createdBy column on the model (documented assumption); left undefined.
  };
}
