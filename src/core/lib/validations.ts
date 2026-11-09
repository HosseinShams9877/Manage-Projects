/** Shared Zod atoms used across modules. */

import { z } from "zod";

export const positiveAmountSchema = z
  .string()
  .min(1, "مبلغ را وارد کنید.")
  .refine((v) => {
    const n = Number(v.replace(/[٬,\s]/g, ""));
    return Number.isFinite(n) && n > 0;
  }, "مبلغ باید عددی مثبت باشد.");

export const optionalNoteSchema = z.string().max(500, "یادداشت حداکثر ۵۰۰ کاراکتر است.").optional().or(z.literal(""));

export const idSchema = z.string().min(1);
