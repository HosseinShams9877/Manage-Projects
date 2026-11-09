/**
 * Central Persian / Jalali formatting utilities.
 * Docs: docs/00-knowledge-layer.md §7.
 * Money is stored in RIAL (BigInt) and displayed in TOMAN.
 */

import dayjs from "dayjs";
import jalaliday from "jalaliday";

dayjs.extend(jalaliday);
dayjs.locale("fa"); // default Persian locale (digits/month names)

/**
 * Parse a date into a Dayjs instance on the Jalali calendar.
 * NOTE: `.locale("fa")` alone keeps the Gregorian calendar — Jalali arithmetic
 * and formatting require `.calendar("jalali")` explicitly.
 */
function toJalaliDayjs(date: Date | string): dayjs.Dayjs {
  return dayjs(typeof date === "string" ? new Date(date) : date)
    .locale("fa")
    .calendar("jalali");
}

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Convert any number/string's ASCII digits to Persian digits. */
export function toPersianDigits(input: string | number | bigint | null | undefined): string {
  if (input === null || input === undefined) return "";
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Convert Persian/Arabic digits in a string to ASCII digits (for parsing inputs). */
export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** Parse a user-typed amount (may contain Persian digits & separators) into rials (BigInt). */
export function parseAmountToRial(input: string): bigint | null {
  const cleaned = toEnglishDigits(input).replace(/[,\s٬]/g, "");
  if (cleaned === "") return null;
  try {
    return BigInt(cleaned);
  } catch {
    return null;
  }
}

const THOUSANDS_SEP = "٬";

/** Group an integer string with thousand separators (Persian `,`). */
export function withSeparators(value: string | number | bigint): string {
  const s = String(value);
  const negative = s.startsWith("-");
  const digits = negative ? s.slice(1) : s;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP);
  return (negative ? "-" : "") + grouped;
}

/** RIAL (BigInt) → Persian Toman string, e.g. 50000000n → "۵٬۰۰۰٬۰۰۰ تومان". */
export function formatToman(rial: bigint | number | string, withUnit = true): string {
  const big = typeof rial === "bigint" ? rial : BigInt(rial);
  const toman = big / 10n;
  const sign = toman < 0n ? "-" : "";
  const abs = toman < 0n ? -toman : toman;
  const out = sign + withSeparators(abs.toString());
  return withUnit ? `${toPersianDigits(out)} تومان` : toPersianDigits(out);
}

/** BigInt-safe percent for progress bars (0..100, 1 decimal). */
export function formatPercent(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n) return 0;
  // scale by 1000 for one decimal place
  const permille = (numerator * 1000n) / denominator;
  const rounded = permille / 10n;
  const frac = permille % 10n;
  const value = Number(rounded) + Number(frac) / 10;
  return Math.min(Math.max(value, 0), 100);
}

/** ISO date → Jalali "YYYY/MM/DD" with Persian digits, e.g. "۱۴۰۳/۰۵/۰۱". */
export function formatJalali(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = toJalaliDayjs(date);
  if (!d.isValid()) return "—";
  return toPersianDigits(d.format("YYYY/MM/DD"));
}

/** ISO datetime → Jalali date + time with Persian digits. */
export function formatJalaliDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = toJalaliDayjs(date);
  if (!d.isValid()) return "—";
  return toPersianDigits(d.format("YYYY/MM/DD - HH:mm"));
}

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** Jalali {year, month (1-12), day} → ISO date string (server stores ISO). */
export function jalaliToISO(jy: number, jm: number, jd: number): string | null {
  try {
    const d = dayjs()
      .calendar("jalali")
      .year(jy)
      .month(jm - 1)
      .date(jd);
    if (!d.isValid()) return null;
    const gregorian = d.calendar("gregory");
    if (!gregorian.isValid()) return null;
    return gregorian.format("YYYY-MM-DD");
  } catch {
    return null;
  }
}

/** ISO date → { jy, jm, jd } for the JalaliDatePicker. */
export function isoToJalaliParts(date: string | Date | null | undefined): {
  jy: number;
  jm: number;
  jd: number;
} | null {
  if (!date) return null;
  const d = toJalaliDayjs(date);
  if (!d.isValid()) return null;
  return { jy: d.year(), jm: d.month() + 1, jd: d.date() };
}

/** True when the given Jalali year has a 30th day of Esfand (leap year). */
export function isJalaliLeapYear(jy: number): boolean {
  const a = jy - 474;
  const b = ((a % 2820) + 2820) % 2820;
  return (((b + 512) * 682) % 2816) < 682;
}

/** Last day of a Jalali month (1-6: 31, 7-11: 30, 12: 29/30 in leap years). */
function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

/**
 * Add Jalali months to an ISO date, keeping the Jalali day clamped to the
 * target month's length. Returns an ISO date string, or null if invalid.
 */
export function addJalaliMonths(iso: string, months: number): string | null {
  const parts = isoToJalaliParts(iso);
  if (!parts) return null;
  const total = parts.jy * 12 + (parts.jm - 1) + months;
  const jy = Math.floor(total / 12);
  const jm = (total % 12) + 1;
  const jd = Math.min(parts.jd, jalaliMonthLength(jy, jm));
  return jalaliToISO(jy, jm, jd);
}

/** Current Jalali year (for picker range). */
export function currentJalaliYear(): number {
  return dayjs().locale("fa").calendar("jalali").year();
}
