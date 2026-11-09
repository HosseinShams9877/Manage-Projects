/**
 * Pure helpers for the bulk-installment plan (client- and server-safe).
 * Docs: docs/00-knowledge-layer.md BR-6 — N near-equal parts, Jalali-spaced.
 */

import { addJalaliMonths, formatJalali, toPersianDigits, withSeparators } from "@/core/lib/format";

/** Split a TOMAN BigInt total into N near-equal parts (first ones absorb remainder). */
export function splitToman(total: bigint, count: number): bigint[] {
  const base = total / BigInt(count);
  const remainder = total % BigInt(count);
  return Array.from({ length: count }, (_, i) => base + (i < Number(remainder) ? 1n : 0n));
}

export interface BulkPlanRow {
  /** Jalali-rendered due date. */
  dueDateLabel: string;
  /** Persian-digit TOMAN amount with separators, no unit. */
  amountLabel: string;
}

/**
 * Preview of a bulk plan: the amounts and Jalali due dates the server will
 * create, before anything is committed.
 */
export function previewBulkPlan(
  totalToman: bigint,
  count: number,
  firstDueDate: string,
  intervalMonths: number,
): BulkPlanRow[] | null {
  if (count <= 0 || totalToman <= 0n) return null;
  return splitToman(totalToman, count).map((amount, i) => {
    const iso = addJalaliMonths(firstDueDate, i * intervalMonths);
    return {
      dueDateLabel: iso ? formatJalali(iso) : "—",
      amountLabel: `${toPersianDigits(withSeparators(amount))} تومان`,
    };
  });
}
