/**
 * Dashboard mappers — Prisma rows → dashboard DTOs.
 * Money becomes a RIAL string; dates become Jalali strings (docs/00 §7).
 */

import type { EmployerPayment, EmployeePayment, Installment } from "@prisma/client";
import { formatJalali } from "@/core/lib/format";
import { formatJalaliRelative } from "@/modules/notifications/lib/relative-time";
import type {
  DashboardActivityDTO,
  DashboardActivityType,
  MyUpcomingInstallmentDTO,
  TopEmployeeDTO,
} from "./schema";

/** Prisma payload shapes used by the service (with the relations it includes). */
export type ActivityEmployerPayment = Pick<EmployerPayment, "id" | "amount" | "date"> & {
  project: { id: string; title: string };
};

export type ActivityEmployeePayment = Pick<
  EmployeePayment,
  "id" | "amount" | "date"
> & {
  project: { id: string; title: string };
  user: { name: string };
};

export type ActivityInstallment = Pick<
  Installment,
  "id" | "amount" | "paidAmount" | "remaining" | "status" | "dueDate"
> & {
  project: { id: string; title: string };
};

const ACTIVITY_LABEL: Record<DashboardActivityType, string> = {
  EMPLOYER_PAYMENT: "پرداخت کارفرما",
  EMPLOYEE_PAYMENT: "پرداخت به کارمند",
  INSTALLMENT: "وصول قسط",
};

export function mapEmployerPaymentActivity(p: ActivityEmployerPayment): DashboardActivityDTO {
  return {
    id: `ep:${p.id}`,
    type: "EMPLOYER_PAYMENT",
    description: ACTIVITY_LABEL.EMPLOYER_PAYMENT,
    amount: String(p.amount),
    jalaliDate: formatJalali(p.date),
    relativeTime: formatJalaliRelative(p.date),
    projectTitle: p.project.title,
  };
}

export function mapEmployeePaymentActivity(p: ActivityEmployeePayment): DashboardActivityDTO {
  return {
    id: `emp:${p.id}`,
    type: "EMPLOYEE_PAYMENT",
    description: ACTIVITY_LABEL.EMPLOYEE_PAYMENT,
    amount: String(p.amount),
    jalaliDate: formatJalali(p.date),
    relativeTime: formatJalaliRelative(p.date),
    projectTitle: p.project.title,
    actorName: p.user.name,
  };
}

/**
 * Installments enter the feed only once money has landed on them (paidAmount > 0):
 * a fully-unpaid check is a *schedule*, not activity — upcoming liabilities are
 * surfaced by the project-health card and the employee feed instead.
 * `amount` is what was actually collected; the event date is the due date.
 */
export function mapInstallmentActivity(i: ActivityInstallment): DashboardActivityDTO {
  return {
    id: `inst:${i.id}`,
    type: "INSTALLMENT",
    description: ACTIVITY_LABEL.INSTALLMENT,
    amount: String(i.paidAmount),
    jalaliDate: formatJalali(i.dueDate),
    relativeTime: formatJalaliRelative(i.dueDate),
    projectTitle: i.project.title,
  };
}

export function mapTopEmployee(e: {
  userId: string;
  name: string;
  share: bigint;
  paid: bigint;
}): TopEmployeeDTO {
  return {
    userId: e.userId,
    name: e.name,
    share: String(e.share),
    paid: String(e.paid),
    remaining: String(e.share - e.paid),
  };
}

export function mapMyUpcomingInstallment(i: ActivityInstallment): MyUpcomingInstallmentDTO {
  return {
    id: i.id,
    projectId: i.project.id,
    projectTitle: i.project.title,
    amount: String(i.amount),
    remaining: String(i.remaining),
    status: i.status,
    jalaliDueDate: formatJalali(i.dueDate),
  };
}
