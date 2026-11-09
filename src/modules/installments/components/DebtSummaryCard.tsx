"use client";

import { AlertTriangle } from "lucide-react";
import { Card } from "@/core/components/Card";
import { ProgressBar } from "@/core/components/ProgressBar";
import { formatToman } from "@/core/lib/format";
import type { ProjectDebtStateDTO } from "../lib/schema";

interface DebtSummaryCardProps {
  debt: ProjectDebtStateDTO;
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground-muted">{label}</span>
      <span
        className={`text-sm font-medium tabular-nums whitespace-nowrap ${
          muted ? "text-foreground-muted" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Snapshot of a project's debt: contract price, cash received from the employer,
 * the amount scheduled across installments, and what is still unallocated.
 */
export function DebtSummaryCard({ debt }: DebtSummaryCardProps) {
  const contract = BigInt(debt.contractPrice);
  const paid = BigInt(debt.paidByEmployer);
  const planTotal = BigInt(debt.installmentPlanTotal);
  const unallocated = BigInt(debt.unallocated);

  // Defensive UI: the server already refuses such plans, but if data ever ends
  // up over-allocated (e.g. a payment deleted after installments were set),
  // surface it loudly instead of silently showing a negative remainder.
  const overAllocated = unallocated < 0n;

  return (
    <Card title="وضعیت بدهی کارفرما" description="خلاصه‌ای از مبلغ قرارداد و پرداخت‌ها">
      <div className="flex flex-col gap-4">
        <Row label="مبلغ کل قرارداد" value={formatToman(contract)} />

        <div className="flex flex-col gap-1.5">
          <Row label="پرداخت‌شده توسط کارفرما" value={formatToman(paid)} />
          <ProgressBar value={paid} total={contract} />
        </div>

        <Row label="برنامه‌ریزی‌شده در اقساط" value={formatToman(planTotal)} />

        <div className="pt-3 border-t border-border">
          {overAllocated ? (
            <div className="flex items-start gap-2 rounded-lg bg-danger-bg p-3 text-danger">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs leading-6">
                مجموع اقساط ({formatToman(planTotal, false)} تومان) بیشتر از بدهی باقی‌مانده
                کارفرما است. برای رفع مشکل، مبلغ یکی از اقساط را کاهش دهید.
              </p>
            </div>
          ) : (
            <Row
              label="بدهی تخصیص‌نیافته"
              muted={unallocated === 0n}
              value={unallocated > 0n ? formatToman(unallocated) : "—"}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
