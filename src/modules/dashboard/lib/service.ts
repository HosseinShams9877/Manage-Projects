/**
 * Dashboard services (Phase 6 §1/§2) — read-only aggregates for the admin
 * landing page and the employee /me enhancements.
 *
 * Conventions inherited from the other modules:
 *  - Money is RIAL BigInt in the DB and RIAL strings on the wire (docs/00 §7);
 *    the UI renders Toman via `formatToman`.
 *  - "This month" means the current **Jalali** month, windowed [start, start+1m).
 *  - Everything is read-only; no mutation, no notifications.
 */

import { prisma } from "@/core/lib/prisma";
import { PersianErrors } from "@/core/lib/api-response";
import { addJalaliMonths, isoToJalaliParts, jalaliToISO, JALALI_MONTHS, toPersianDigits } from "@/core/lib/format";
import type {
  AdminDashboardDTO,
  DashboardActivityDTO,
  EmployeeDashboardDTO,
} from "./schema";
import {
  mapEmployeePaymentActivity,
  mapEmployerPaymentActivity,
  mapInstallmentActivity,
  mapMyUpcomingInstallment,
  mapTopEmployee,
  type ActivityEmployeePayment,
  type ActivityEmployerPayment,
  type ActivityInstallment,
} from "./mappers";

type Session = { sub: string; role: "ADMIN" | "EMPLOYEE" };

/** [start, end) of the current Jalali month as UTC Dates, plus its label. */
function currentJalaliMonth(): { label: string; start: Date; end: Date } {
  const today = isoToJalaliParts(new Date());
  // Fall back to the Gregorian month if Jalali conversion ever fails — the
  // window must stay usable, and this never triggers in practice.
  if (!today) {
    const now = new Date();
    const gStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { label: "", start: gStart, end: new Date(gStart.getTime() + 31 * 86_400_000) };
  }
  const startISO = jalaliToISO(today.jy, today.jm, 1);
  const endISO = startISO ? addJalaliMonths(startISO, 1) : null;
  if (!startISO || !endISO) {
    const now = new Date();
    const gStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { label: "", start: gStart, end: new Date(gStart.getTime() + 31 * 86_400_000) };
  }
  return {
    label: `${JALALI_MONTHS[today.jm - 1]} ${toPersianDigits(today.jy)}`,
    start: new Date(`${startISO}T00:00:00.000Z`),
    end: new Date(`${endISO}T00:00:00.000Z`),
  };
}

/** Start of today (UTC) — overdue/active cutoffs compare dates, not instants. */
function startOfTodayUTC(): Date {
  const iso = new Date().toISOString().slice(0, 10);
  return new Date(`${iso}T00:00:00.000Z`);
}

const ACTIVITY_PAGE = 10;

/**
 * Admin dashboard aggregates (§1). One round-trip per concern; totals are
 * BigInt-safe (`_sum` is null on an empty table → 0n).
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardDTO> {
  const month = currentJalaliMonth();
  const today = startOfTodayUTC();

  const [
    totalProjects,
    contractAgg,
    employerAgg,
    employeeShareAgg,
    employeePaidAgg,
    paidThisMonthAgg,
    paidToEmployeesThisMonthAgg,
    pastEndDate,
    withOverdueInstallments,
    shareGroups,
    paidGroups,
    employerActivity,
    employeeActivity,
    installmentActivity,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.aggregate({ _sum: { contractPrice: true } }),
    prisma.employerPayment.aggregate({ _sum: { amount: true } }),
    prisma.projectAssignment.aggregate({ _sum: { shareAmount: true } }),
    prisma.employeePayment.aggregate({ _sum: { amount: true } }),
    prisma.employerPayment.aggregate({
      where: { date: { gte: month.start, lt: month.end } },
      _sum: { amount: true },
    }),
    prisma.employeePayment.aggregate({
      where: { date: { gte: month.start, lt: month.end } },
      _sum: { amount: true },
    }),
    prisma.project.count({ where: { endDate: { lt: today, not: null } } }),
    prisma.project.count({
      where: {
        installments: {
          some: { deletedAt: null, status: { not: "PAID" }, dueDate: { lt: today } },
        },
      },
    }),
    prisma.projectAssignment.groupBy({ by: ["userId"], _sum: { shareAmount: true } }),
    prisma.employeePayment.groupBy({ by: ["userId"], _sum: { amount: true } }),
    prisma.employerPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_PAGE,
      include: { project: { select: { id: true, title: true } } },
    }),
    prisma.employeePayment.findMany({
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_PAGE,
      include: {
        project: { select: { id: true, title: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.installment.findMany({
      where: { deletedAt: null, paidAmount: { gt: 0n } },
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_PAGE,
      include: { project: { select: { id: true, title: true } } },
    }),
  ]);

  const totalContractValue = contractAgg._sum.contractPrice ?? 0n;
  const totalPaidByEmployers = employerAgg._sum.amount ?? 0n;
  const totalEmployeeShare = employeeShareAgg._sum.shareAmount ?? 0n;
  const totalPaidToEmployees = employeePaidAgg._sum.amount ?? 0n;

  // Top employees by remaining (share − paid), descending, capped at 5.
  const paidByUser = new Map(paidGroups.map((g) => [g.userId, g._sum.amount ?? 0n]));
  const ranked = shareGroups
    .map((g) => ({
      userId: g.userId,
      share: g._sum.shareAmount ?? 0n,
      paid: paidByUser.get(g.userId) ?? 0n,
    }))
    .filter((e) => e.share - e.paid > 0n)
    .sort((a, b) => Number(b.share - b.paid - (a.share - a.paid)))
    .slice(0, 5);

  const topUserIds = ranked.map((e) => e.userId);
  const topUsers =
    topUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topUserIds } },
          select: { id: true, name: true },
        })
      : [];
  const nameById = new Map(topUsers.map((u) => [u.id, u.name]));

  // Merge the three activity streams, newest row first, then map to DTOs.
  // Each row keeps its own createdAt for the merge; the mapper drops it.
  const merged: { createdAt: Date; toDTO: () => DashboardActivityDTO }[] = [
    ...employerActivity.map((p) => ({
      createdAt: p.createdAt,
      toDTO: () => mapEmployerPaymentActivity(p satisfies ActivityEmployerPayment),
    })),
    ...employeeActivity.map((p) => ({
      createdAt: p.createdAt,
      toDTO: () => mapEmployeePaymentActivity(p satisfies ActivityEmployeePayment),
    })),
    ...installmentActivity.map((i) => ({
      createdAt: i.createdAt,
      toDTO: () => mapInstallmentActivity(i satisfies ActivityInstallment),
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, ACTIVITY_PAGE);

  return {
    totalProjects,
    totalContractValue: String(totalContractValue),
    totalPaidByEmployers: String(totalPaidByEmployers),
    totalClientOutstanding: String(totalContractValue - totalPaidByEmployers),
    totalEmployeeShare: String(totalEmployeeShare),
    totalPaidToEmployees: String(totalPaidToEmployees),
    totalEmployeeRemaining: String(totalEmployeeShare - totalPaidToEmployees),
    paidThisMonth: String(paidThisMonthAgg._sum.amount ?? 0n),
    paidToEmployeesThisMonth: String(paidToEmployeesThisMonthAgg._sum.amount ?? 0n),
    currentMonthLabel: month.label,
    projectHealth: {
      total: totalProjects,
      active: totalProjects - pastEndDate,
      pastEndDate,
      withOverdueInstallments,
    },
    topEmployees: ranked.map((e) =>
      mapTopEmployee({ userId: e.userId, name: nameById.get(e.userId) ?? "—", share: e.share, paid: e.paid }),
    ),
    recentActivity: merged.map((m) => m.toDTO()),
  };
}

/**
 * Employee dashboard additions (§2): received-this-month (current Jalali
 * month) and the next ≤3 upcoming installments on MY assigned projects.
 * Employees may only query themselves; admins may query anyone.
 */
export async function getEmployeeDashboardStats(
  userId: string,
  session: Session,
): Promise<EmployeeDashboardDTO> {
  if (session.role !== "ADMIN" && session.sub !== userId) throw PersianErrors.forbidden();

  const month = currentJalaliMonth();

  const assignments = await prisma.projectAssignment.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = assignments.map((a) => a.projectId);

  const [receivedAgg, installments] = await Promise.all([
    prisma.employeePayment.aggregate({
      where: { userId, date: { gte: month.start, lt: month.end } },
      _sum: { amount: true },
    }),
    projectIds.length > 0
      ? prisma.installment.findMany({
          where: {
            projectId: { in: projectIds },
            deletedAt: null,
            status: { not: "PAID" },
            dueDate: { gte: startOfTodayUTC() },
          },
          orderBy: { dueDate: "asc" },
          take: 3,
          include: { project: { select: { id: true, title: true } } },
        })
      : Promise.resolve([]),
  ]);

  return {
    receivedThisMonth: String(receivedAgg._sum.amount ?? 0n),
    currentMonthLabel: month.label,
    upcomingInstallments: installments.map(mapMyUpcomingInstallment),
  };
}
