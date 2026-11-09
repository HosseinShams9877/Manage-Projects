import { toPersianDigits } from "@/core/lib/format";

interface ProgressBarProps {
  /** Current paid amount (rial). */
  value: bigint | number;
  /** Total amount (rial). */
  total: bigint | number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({ value, total, showLabel = true, className = "" }: ProgressBarProps) {
  const bigTotal = typeof total === "bigint" ? total : BigInt(total);
  const bigValue = typeof value === "bigint" ? value : BigInt(value);

  let pct = 0;
  if (bigTotal > 0n) {
    const permille = (bigValue * 1000n) / bigTotal;
    pct = Math.min(Math.max(Number(permille) / 10, 0), 100);
  }

  const tone =
    pct >= 100
      ? "bg-success"
      : pct >= 50
        ? "bg-brand-500"
        : pct > 0
          ? "bg-warning"
          : "bg-muted";

  return (
    <div className={className}>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone}`}
          style={{ width: `${Math.round(pct)}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-foreground-muted tabular-nums">
          {toPersianDigits(pct.toFixed(1).replace(/\.0$/, ""))}٪
        </div>
      )}
    </div>
  );
}
