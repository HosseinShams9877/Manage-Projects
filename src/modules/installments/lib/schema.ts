/**
 * Installments module (قسط/چک — scheduled future payments from the client).
 * Docs: docs/00-knowledge-layer.md business rules BR-4/BR-6.
 *
 * Money: amounts arrive as TOMAN strings from the client and are stored as
 * RIAL BigInt (×10 in the service layer).
 * Dates: dueDate/firstDueDate are ISO date strings from the Jalali date picker.
 */

import { z } from "zod";
import { tomanAmountSchema } from "@/core/lib/validation";

/** ISO date string (from the Jalali date picker). */
const isoDateSchema = z
  .string()
  .trim()
  .min(1, "تاریخ الزامی است.")
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)), "تاریخ وارد شده نامعتبر است.");

const noteSchema = z
  .string()
  .trim()
  .max(500, "توضیحات نباید بیشتر از ۵۰۰ کاراکتر باشد.")
  .optional()
  .or(z.literal(""));

export const createInstallmentSchema = z.object({
  projectId: z.string().trim().min(1, "شناسه پروژه الزامی است."),
  /** TOMAN string, as typed (may contain separators/Persian digits). */
  amount: tomanAmountSchema,
  dueDate: isoDateSchema,
  note: noteSchema,
});

export const bulkInstallmentsSchema = z.object({
  projectId: z.string().trim().min(1, "شناسه پروژه الزامی است."),
  /** Total TOMAN amount, split into `count` near-equal installments. */
  totalAmount: tomanAmountSchema,
  count: z
    .number()
    .int("تعداد اقساط باید یک عدد صحیح باشد.")
    .min(2, "تعداد اقساط باید حداقل ۲ باشد.")
    .max(60, "تعداد اقساط نمی‌تواند بیشتر از ۶۰ باشد."),
  firstDueDate: isoDateSchema,
  /** Step between successive due dates, in Jalali months (1, 2, 3, …). */
  intervalMonths: z
    .number()
    .int("فاصله اقساط باید یک عدد صحیح باشد.")
    .min(1, "فاصله اقساط باید حداقل ۱ ماه باشد.")
    .max(12, "فاصله اقساط نمی‌تواند بیشتر از ۱۲ ماه باشد."),
  note: noteSchema,
});

export const partialPaymentSchema = z.object({
  installmentId: z.string().trim().min(1, "شناسه قسط الزامی است."),
  amount: tomanAmountSchema,
  jalaliDate: isoDateSchema,
  note: noteSchema,
});

export const updateInstallmentSchema = z.object({
  id: z.string().trim().min(1, "شناسه قسط الزامی است."),
  amount: tomanAmountSchema.optional(),
  dueDate: isoDateSchema.optional(),
  note: noteSchema,
});

export const updateDueDateSchema = z.object({
  id: z.string().trim().min(1, "شناسه قسط الزامی است."),
  dueDate: isoDateSchema,
});

export type CreateInstallmentInput = z.infer<typeof createInstallmentSchema>;
export type BulkInstallmentsInput = z.infer<typeof bulkInstallmentsSchema>;
export type PartialPaymentInput = z.infer<typeof partialPaymentSchema>;
export type UpdateInstallmentInput = z.infer<typeof updateInstallmentSchema>;
export type UpdateDueDateInput = z.infer<typeof updateDueDateSchema>;

export const INSTALLMENT_STATUSES = ["PENDING", "PARTIAL", "PAID"] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

/** What the API returns for one installment. */
export interface InstallmentDTO {
  id: string;
  projectId: string;
  /** RIAL, serialized as string (BigInt is not JSON-safe). */
  amount: string;
  /** RIAL paid so far. */
  paidAmount: string;
  /** RIAL still owed on this installment (amount − paidAmount). */
  remainingAmount: string;
  /** ISO date string (Jalali-rendered on the client). */
  dueDate: string;
  status: InstallmentStatus;
  note: string;
  /** True when the due date has passed and the installment is not fully paid. */
  isPast: boolean;
  createdAt: string;
}

export interface InstallmentListDTO {
  installments: InstallmentDTO[];
  total: number;
  /** Debt snapshot of the project (feeds DebtSummaryCard). */
  debt: ProjectDebtStateDTO;
}

/** Debt breakdown of one project (RIAL strings). */
export interface ProjectDebtStateDTO {
  contractPrice: string;
  /** Total actually received from the client (Σ EmployerPayment). */
  paidByEmployer: string;
  /** Total scheduled across all (non-deleted) installments. */
  installmentPlanTotal: string;
  /** Contract − paid − what installments still owe: money with no plan yet. */
  unallocated: string;
  /** Room left for new installments: clientOutstanding − installmentPlanTotal. */
  availableForNewInstallment: string;
}

/** Client-side form values. */
export interface InstallmentFormValues {
  amount: string;
  dueDate: string;
  note: string;
}

export interface BulkInstallmentFormValues {
  totalAmount: string;
  count: number;
  firstDueDate: string;
  intervalMonths: number;
  note: string;
}

export interface PartialPaymentFormValues {
  amount: string;
  jalaliDate: string;
  note: string;
}
