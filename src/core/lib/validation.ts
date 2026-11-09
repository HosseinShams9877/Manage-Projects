/**
 * Shared Zod money schema. Amounts arrive from the client as TOMAN strings
 * (the CurrencyInput emits digit strings) and are converted to RIAL BigInt in
 * the service layer: rial = toman × 10. Docs: docs/00-knowledge-layer.md.
 */

import { z } from "zod";
import { toEnglishDigits } from "@/core/lib/format";

/** TOMAN amount typed by the user: digits & separators allowed, must be > 0. */
export const tomanAmountSchema = z
  .string()
  .trim()
  .min(1, "مبلغ الزامی است.")
  .refine((v) => {
    const cleaned = toEnglishDigits(v).replace(/[,\s٬]/g, "");
    return /^\d+$/.test(cleaned);
  }, "مبلغ باید یک عدد صحیح مثبت باشد.")
  .refine((v) => {
    const cleaned = BigInt(toEnglishDigits(v).replace(/[,\s٬]/g, ""));
    return cleaned > 0;
  }, "مبلغ باید بزرگتر از صفر باشد.");

/** TOMAN string (with possible separators) → RIAL BigInt. */
export function tomanStringToRial(input: string): bigint {
  const cleaned = toEnglishDigits(input).replace(/[,\s٬]/g, "");
  return BigInt(cleaned) * 10n;
}
