/**
 * Employee payments module — payments made to employees against their project
 * shares, plus per-employee balance aggregation.
 * Docs: docs/01-roadmap.md phase 4, docs/00-knowledge-layer.md.
 *
 * Money: amount arrives as a TOMAN string from the client and is stored as
 * RIAL BigInt (×10 in the service layer), exactly like employer payments.
 * Dates: jalaliDate is an ISO date string, produced by JalaliDatePicker.
 * All BigInts leave the service as strings (BigInt is not JSON-safe).
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

export const createEmployeePaymentSchema = z.object({
  projectId: z.string().trim().min(1, "انتخاب پروژه الزامی است."),
  userId: z.string().trim().min(1, "انتخاب کارمند الزامی است."),
  /** TOMAN string, as typed (may contain separators/Persian digits). */
  amount: tomanAmountSchema,
  jalaliDate: isoDateSchema,
  note: noteSchema,
});

export const updateEmployeePaymentSchema = z.object({
  id: z.string().trim().min(1, "شناسه پرداخت الزامی است."),
  projectId: z.string().trim().min(1, "انتخاب پروژه الزامی است.").optional(),
  userId: z.string().trim().min(1, "انتخاب کارمند الزامی است.").optional(),
  amount: tomanAmountSchema.optional(),
  jalaliDate: isoDateSchema.optional(),
  note: noteSchema,
});

export type CreateEmployeePaymentInput = z.infer<typeof createEmployeePaymentSchema>;
export type UpdateEmployeePaymentInput = z.infer<typeof updateEmployeePaymentSchema>;

/** What the API returns for one employee payment. */
export interface EmployeePaymentDTO {
  id: string;
  projectId: string;
  projectTitle: string;
  userId: string;
  userName: string;
  /** RIAL, serialized as string (BigInt is not JSON-safe). */
  amount: string;
  /** ISO date string (Jalali-rendered on the client). */
  jalaliDate: string;
  note: string;
  createdAt: string;
}

export interface EmployeePaymentListDTO {
  payments: EmployeePaymentDTO[];
  total: number;
}

/** Server-side filter for listing employee payments. */
export interface EmployeePaymentFilter {
  userId?: string;
  projectId?: string;
}

/** One project row inside an employee balance. */
export interface EmployeeProjectBalanceDTO {
  projectId: string;
  title: string;
  sharePercent: number;
  /** RIAL as string. */
  shareAmount: string;
  /** RIAL as string. */
  paid: string;
  /** RIAL as string. shareAmount − paid. */
  remaining: string;
  /** ISO date string of the latest payment on this project, or null. */
  lastPaymentDate: string | null;
}

/** Aggregate balance of one employee across every assigned project. */
export interface EmployeeBalanceDTO {
  userId: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  /** RIAL as string. */
  totalShare: string;
  /** RIAL as string. */
  totalPaid: string;
  /** RIAL as string. totalShare − totalPaid. */
  totalRemaining: string;
  projects: EmployeeProjectBalanceDTO[];
}

export interface EmployeeBalancesDTO {
  employees: EmployeeBalanceDTO[];
}

/**
 * One assigned project of an employee, as returned by
 * GET /api/employees/[id]/assigned-projects (fix-up patch).
 *
 * NOTE: unlike every other DTO in this module (RIAL strings), the money fields
 * here are **TOMAN** strings on the wire (shareAmount, paidToEmployee,
 * remaining). The client compares/guards against them directly, without the
 * ×10 conversion the RIAL-string DTOs need.
 */
export interface AssignedProjectDTO {
  projectId: string;
  projectTitle: string;
  sharePercent: number;
  /** TOMAN, serialized as string. */
  shareAmount: string;
  /** TOMAN, serialized as string. */
  paidToEmployee: string;
  /** TOMAN, serialized as string. shareAmount − paidToEmployee. */
  remaining: string;
}

/** Client-side form values (amount is a TOMAN string as typed). */
export interface EmployeePaymentFormValues {
  userId: string;
  projectId: string;
  amount: string;
  jalaliDate: string;
  note: string;
}
