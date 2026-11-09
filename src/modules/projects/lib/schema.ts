/**
 * Zod schemas for the Projects module.
 * Docs: docs/00-knowledge-layer.md §6 (validation constraints V-1..V-10).
 *
 * Money: contractPrice arrives as a STRING from the client (bigint-safe) and is
 * converted to RIAL BigInt in the service layer (see lib/service.ts).
 * Dates: Jalali inputs arrive as ISO strings (YYYY-MM-DD) via JalaliDatePicker.
 */

import { z } from "zod";

/** Contract price in TOMAN typed by the user, as a string (bigint-safe). */
export const contractPriceSchema = z
  .string()
  .trim()
  .min(1, "مبلغ قرارداد الزامی است.")
  .refine((v) => {
    const cleaned = v.replace(/[,\s٬]/g, "");
    return /^\d+$/.test(cleaned);
  }, "مبلغ قرارداد باید یک عدد صحیح مثبت باشد.")
  .refine((v) => {
    const cleaned = BigInt(v.replace(/[,\s٬]/g, ""));
    return cleaned > 0;
  }, "مبلغ قرارداد باید بزرگتر از صفر باشد.");

/** Optional text fields. */
export const titleSchema = z.string().trim().min(1, "عنوان پروژه الزامی است.").max(200, "عنوان پروژه نباید بیشتر از ۲۰۰ کاراکتر باشد.");
export const descriptionSchema = z.string().trim().max(2000, "توضیحات نباید بیشتر از ۲۰۰۰ کاراکتر باشد.").optional().or(z.literal(""));
export const clientCompanySchema = z.string().trim().max(150, "نام کارفرما نباید بیشتر از ۱۵۰ کاراکتر باشد.").optional().or(z.literal(""));

/** ISO date string (from the Jalali date picker) or empty. */
export const isoDateSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => {
    if (!v) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  }, "تاریخ وارد شده نامعتبر است.");

/** One employee share row. */
export const assignmentInputSchema = z.object({
  userId: z.string().trim().min(1, "کارمند را انتخاب کنید."),
  sharePercent: z
    .number({ invalid_type_error: "درصد سهم باید عدد باشد." })
    .int("درصد سهم باید عدد صحیح باشد.")
    .min(0, "درصد سهم نمی‌تواند منفی باشد.")
    .max(100, "درصد سهم نمی‌تواند بیشتر از ۱۰۰ باشد."),
});

/** Shared shape for create/update payloads. */
const projectBaseSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  clientCompany: clientCompanySchema,
  contractPrice: contractPriceSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema,
});

/** Dates sanity: end date must not be before start date. */
function hasValidDateRange(data: { startDate?: string; endDate?: string }) {
  if (!data?.startDate || !data?.endDate) return true;
  return new Date(data.endDate) >= new Date(data.startDate);
}

const DATE_RANGE_ERROR = {
  message: "تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.",
  path: ["endDate"],
};

/** Assignment list: total share must equal exactly 100 (BR-2). Undefined → skip. */
function sharesEqual100(data: { assignments?: { sharePercent: number }[] }) {
  if (!data.assignments) return true;
  return data.assignments.reduce((acc, a) => acc + a.sharePercent, 0) === 100;
}

function sharesSumMessage(data: { assignments?: { sharePercent: number }[] }) {
  const sum = (data.assignments ?? []).reduce((acc, a) => acc + a.sharePercent, 0);
  return {
    message: `مجموع درصد سهم کارمندان باید دقیقاً ۱۰۰ باشد. مجموع فعلی: ${sum}.`,
    path: ["assignments"],
  };
}

export const createProjectSchema = projectBaseSchema
  .extend({
    assignments: z.array(assignmentInputSchema).min(1, "حداقل یک کارمند باید به پروژه اختصاص یابد."),
  })
  .refine(hasValidDateRange, DATE_RANGE_ERROR)
  .refine(sharesEqual100, sharesSumMessage);

export const updateProjectSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    clientCompany: clientCompanySchema.optional(),
    contractPrice: contractPriceSchema.optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    assignments: z.array(assignmentInputSchema).optional(),
  })
  .refine(hasValidDateRange, DATE_RANGE_ERROR)
  .refine(sharesEqual100, (data) => sharesSumMessage(data));

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

/** What the API returns for one assignment (see lib/mappers.ts). */
export interface AssignmentDTO {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  sharePercent: number;
  /** Share amount in RIAL (BigInt serialized as string). */
  shareAmount: string;
}

/** What the API returns for one project. */
export interface ProjectDTO {
  id: string;
  title: string;
  description: string;
  clientCompany: string;
  /** RIAL, serialized as string (BigInt is not JSON-safe). */
  contractPrice: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  /** Sum of employer payments, RIAL string. */
  paidAmount: string;
  /** contractPrice - paidAmount, RIAL string. */
  remainingAmount: string;
  /** 0..100 progress paid vs contract price. */
  progressPercent: number;
  assignments: AssignmentDTO[];
  /** Whether the current user can edit (admin only). */
  canEdit: boolean;
  /** Whether the current user can delete (admin only). */
  canDelete: boolean;
}

/** List endpoint payload: projects the current user is allowed to see. */
export interface ProjectListDTO {
  projects: ProjectDTO[];
  total: number;
}

/** Payload to create a project (client-side form values). */
export interface ProjectFormValues {
  title: string;
  description: string;
  clientCompany: string;
  /** Toman string, as typed (may contain separators/Persian digits). */
  contractPrice: string;
  startDate: string | null;
  endDate: string | null;
  assignments: AssignmentInput[];
}
