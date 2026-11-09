/**
 * Jalali relative-time helper, e.g. «۲ ساعت پیش».
 * The Persian wording («پیش»/«در») comes from the `fa` *locale*; the jalali
 * *calendar* must be applied to BOTH sides of the comparison. dayjs's
 * relativeTime plugin computes month/year diffs via each side's calendar
 * hooks, so `jalaliDate.fromNow()` mixes a jalali instance with a gregorian
 * `dayjs()` and yields nonsense (e.g. «در ۸ سال» for a date 11 months ago).
 */

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { toPersianDigits } from "@/core/lib/format";

dayjs.extend(relativeTime);

/** ISO date → Persian relative time such as «۲ ساعت پیش» / «چند ثانیه پیش». */
export function formatJalaliRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = dayjs(typeof date === "string" ? new Date(date) : date)
    .locale("fa")
    .calendar("jalali");
  if (!d.isValid()) return "—";
  const now = dayjs().locale("fa").calendar("jalali");
  return toPersianDigits(d.from(now));
}
