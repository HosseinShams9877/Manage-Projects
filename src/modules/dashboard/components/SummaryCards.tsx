/**
 * Admin dashboard summary cards (Phase 6 §1) — eight aggregate figures.
 * Pure/presentational: the parent feeds it the resolved DTO (or renders the
 * skeleton grid while the query loads). Money arrives as RIAL strings and is
 * rendered in Toman through `formatToman`; numbers through `toPersianDigits`.
 */

import {
  Banknote,
  CalendarRange,
  Coins,
  CreditCard,
  FolderKanban,
  PiggyBank,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/core/components/Card";
import { formatToman, toPersianDigits } from "@/core/lib/format";
import type { AdminDashboardDTO } from "../lib/schema";

interface SummaryCardsProps {
  stats: AdminDashboardDTO;
}

interface CardDef {
  icon: LucideIcon;
  label: string;
  /** Main value line. */
  value: string;
  /** Optional muted second line (month label, secondary total…). */
  hint?: string;
  tone: "brand" | "success" | "warning" | "neutral";
}

const TONE_ICON: Record<CardDef["tone"], string> = {
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  neutral: "bg-muted text-foreground-muted",
};

export function SummaryCards({ stats }: SummaryCardsProps) {
  const cards: CardDef[] = [
    {
      icon: FolderKanban,
      label: "تعداد پروژه‌ها",
      value: toPersianDigits(stats.totalProjects),
      tone: "brand",
    },
    {
      icon: Wallet,
      label: "ارزش کل قراردادها",
      value: formatToman(stats.totalContractValue),
      tone: "neutral",
    },
    {
      icon: Banknote,
      label: "دریافت‌شده از کارفرما",
      value: formatToman(stats.totalPaidByEmployers),
      tone: "success",
    },
    {
      icon: CreditCard,
      label: "مانده بدهی کارفرما",
      value: formatToman(stats.totalClientOutstanding),
      tone: stats.totalClientOutstanding === "0" ? "neutral" : "warning",
    },
    {
      icon: CalendarRange,
      label: "دریافت این ماه",
      value: formatToman(stats.paidThisMonth),
      hint: stats.currentMonthLabel,
      tone: "brand",
    },
    {
      icon: Coins,
      label: "پرداخت به کارمندان این ماه",
      value: formatToman(stats.paidToEmployeesThisMonth),
      hint: stats.currentMonthLabel,
      tone: "success",
    },
    {
      icon: Users,
      label: "کل سهم کارمندان",
      value: formatToman(stats.totalEmployeeShare),
      hint: `پرداخت‌شده: ${formatToman(stats.totalPaidToEmployees)}`,
      tone: "neutral",
    },
    {
      icon: PiggyBank,
      label: "مانده پرداخت کارمندان",
      value: formatToman(stats.totalEmployeeRemaining),
      tone: stats.totalEmployeeRemaining === "0" ? "neutral" : "warning",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${TONE_ICON[c.tone]}`}
                aria-hidden
              >
                <Icon className="w-4 h-4" />
              </span>
              <p className="text-xs text-foreground-muted">{c.label}</p>
            </div>
            <p className="text-lg font-bold text-foreground mt-2 tabular-nums break-words">
              {c.value}
            </p>
            {c.hint ? (
              <p className="text-xs text-foreground-subtle mt-1 tabular-nums">{c.hint}</p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
