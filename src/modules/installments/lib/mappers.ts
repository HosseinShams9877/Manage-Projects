import type { Installment } from "@prisma/client";
import type { InstallmentDTO, InstallmentStatus } from "./schema";

/** Start of today (server local time) for the isPast flag. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function mapInstallmentToDTO(i: Installment): InstallmentDTO {
  const amount = i.amount;
  const paidAmount = i.paidAmount;
  const remaining = amount - paidAmount;
  return {
    id: i.id,
    projectId: i.projectId,
    amount: amount.toString(),
    paidAmount: paidAmount.toString(),
    remainingAmount: remaining.toString(),
    dueDate: i.dueDate.toISOString(),
    status: i.status as InstallmentStatus,
    note: i.note,
    // Overdue = the due date has passed and it is not fully paid.
    isPast: i.dueDate < startOfToday() && i.status !== "PAID",
    createdAt: i.createdAt.toISOString(),
  };
}
