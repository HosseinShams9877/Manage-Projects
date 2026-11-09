/**
 * Payments module (employer payments — actual cash received from the client).
 * Docs: docs/00-knowledge-layer.md business rules BR-4/BR-5.
 *
 * Money: amount arrives as a TOMAN string from the client and is stored as
 * RIAL BigInt (×10 in the service layer).
 * Dates: jalaliDate is an ISO date string, produced by JalaliDatePicker.
 */

import { z } from "zod";
import { tomanAmountSchema } from "@/core/lib/validation";

/** ISO date string (from the Jalali date picker). Required for a payment. */
const isoDateSchema = z
  .string()
  .trim()
  .min(1, "تاریخ پرداخت الزامی است.")
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)), "تاریخ وارد شده نامعتبر است.");

const noteSchema = z
  .string()
  .trim()
  .max(500, "توضیحات نباید بیشتر از ۵۰۰ کاراکتر باشد.")
  .optional()
  .or(z.literal(""));

export const createEmployerPaymentSchema = z.object({
  projectId: z.string().trim().min(1, "شناسه پروژه الزامی است."),
  /** TOMAN string, as typed (may contain separators/Persian digits). */
  amount: tomanAmountSchema,
  jalaliDate: isoDateSchema,
  note: noteSchema,
});

export const updateEmployerPaymentSchema = z.object({
  id: z.string().trim().min(1, "شناسه پرداخت الزامی است."),
  amount: tomanAmountSchema.optional(),
  jalaliDate: isoDateSchema.optional(),
  note: noteSchema,
});

export type CreateEmployerPaymentInput = z.infer<typeof createEmployerPaymentSchema>;
export type UpdateEmployerPaymentInput = z.infer<typeof updateEmployerPaymentSchema>;

/** What the API returns for one employer payment. */
export interface EmployerPaymentDTO {
  id: string;
  projectId: string;
  /** RIAL, serialized as string (BigInt is not JSON-safe). */
  amount: string;
  /** ISO date string (Jalali-rendered on the client). */
  jalaliDate: string;
  note: string;
  createdAt: string;
  /** Not persisted yet — the Prisma model has no createdBy column. */
  createdByName?: string;
}

export interface EmployerPaymentListDTO {
  payments: EmployerPaymentDTO[];
  total: number;
}

/** Client-side form values. */
export interface PaymentFormValues {
  /** TOMAN string as typed. */
  amount: string;
  jalaliDate: string;
  note: string;
}
