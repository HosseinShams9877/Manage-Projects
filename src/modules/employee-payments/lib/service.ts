/**
 * Employee payments service — payments made to employees against their project
 * shares, plus the balance aggregation built on top of them.
 * Docs: docs/01-roadmap.md phase 4, docs/00-knowledge-layer.md §6.
 *
 * Rules:
 *  - ADMIN may create/update/delete; an employee only ever sees their own
 *    records, and only on projects they are assigned to.
 *  - A payment can never exceed the employee's remaining share on that
 *    project: shareAmount (stored at assignment time = contractPrice ×
 *    sharePercent / 100) minus the sum of that employee's payments there.
 *  - Creating a payment notifies the receiving employee after the commit.
 *  - Money is RIAL BigInt; the client sends TOMAN strings (×10 here).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/core/lib/prisma";
import { PersianErrors } from "@/core/lib/api-response";
import { formatToman } from "@/core/lib/format";
import { tomanStringToRial } from "@/core/lib/validation";
import { notifyUser } from "@/modules/notifications/lib/service";
import type {
  AssignedProjectDTO,
  CreateEmployeePaymentInput,
  EmployeeBalanceDTO,
  EmployeeBalancesDTO,
  EmployeePaymentDTO,
  EmployeePaymentFilter,
  EmployeePaymentListDTO,
  EmployeeProjectBalanceDTO,
  UpdateEmployeePaymentInput,
} from "./schema";
import {
  ASSIGNMENT_INCLUDE,
  EMPLOYEE_PAYMENT_INCLUDE,
  buildEmployeeBalance,
  mapAssignmentToBalance,
  mapEmployeePaymentToDTO,
  sumBalanceTotals,
} from "./mappers";

type Session = { sub: string; role: "ADMIN" | "EMPLOYEE" };

/** RIAL BigInt → Toman string with separators and Persian digits (no unit). */
function tomanLabel(rial: bigint): string {
  return formatToman(rial, false);
}

/** RIAL string → plain TOMAN string (÷10), for the Toman-on-the-wire DTOs. */
function rialStringToTomanString(rial: string): string {
  return (BigInt(rial) / 10n).toString();
}

/** Sum + latest date of one employee's payments on one project. */
async function paidOf(
  projectId: string,
  userId: string,
): Promise<{ sum: bigint; max: Date | null }> {
  const agg = await prisma.employeePayment.aggregate({
    where: { projectId, userId },
    _sum: { amount: true },
    _max: { date: true },
  });
  return { sum: agg._sum.amount ?? 0n, max: agg._max.date ?? null };
}

/** Fetch an employee payment raw or 404. */
async function getEmployeePaymentOrThrow(id: string) {
  const payment = await prisma.employeePayment.findUnique({
    where: { id },
    include: EMPLOYEE_PAYMENT_INCLUDE,
  });
  if (!payment) throw PersianErrors.notFound("پرداخت");
  return payment;
}

/** Per-project balance rows of one employee (their assigned projects only). */
async function balanceProjectsOf(userId: string): Promise<EmployeeProjectBalanceDTO[]> {
  const [assignments, groups] = await Promise.all([
    prisma.projectAssignment.findMany({
      where: { userId },
      include: ASSIGNMENT_INCLUDE,
      orderBy: { project: { title: "asc" } },
    }),
    prisma.employeePayment.groupBy({
      by: ["projectId"],
      where: { userId },
      _sum: { amount: true },
      _max: { date: true },
    }),
  ]);

  const paidByProject = new Map(groups.map((g) => [g.projectId, g]));
  return assignments.map((a) => {
    const g = paidByProject.get(a.projectId);
    return mapAssignmentToBalance(a, g?._sum.amount ?? 0n, g?._max.date ?? null);
  });
}

/** Remaining share of one employee on one project (share − paid). */
export async function getEmployeeProjectBalance(
  projectId: string,
  userId: string,
): Promise<EmployeeProjectBalanceDTO> {
  const assignment = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: ASSIGNMENT_INCLUDE,
  });
  if (!assignment) throw PersianErrors.notFound("سهم کارمند");

  const paid = await paidOf(projectId, userId);
  return mapAssignmentToBalance(assignment, paid.sum, paid.max);
}

/**
 * Projects one employee is assigned to, with their share and what is left of it.
 * Admins may query anyone; an employee may only query themselves. Money leaves
 * as TOMAN strings (÷10 of the stored RIAL), per the fix-up contract.
 */
export async function listAssignedProjectsForEmployee(
  userId: string,
  session: Session,
): Promise<AssignedProjectDTO[]> {
  if (session.role !== "ADMIN" && session.sub !== userId) throw PersianErrors.forbidden();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw PersianErrors.notFound("کارمند");

  const assignments = await prisma.projectAssignment.findMany({
    where: { userId },
    orderBy: { project: { title: "asc" } },
  });

  // Reuse the per-project balance helper so this list can never disagree with
  // the balance endpoint (same share/paid/remaining math).
  const balances = await Promise.all(
    assignments.map((a) => getEmployeeProjectBalance(a.projectId, userId)),
  );

  return balances.map((b) => ({
    projectId: b.projectId,
    projectTitle: b.title,
    sharePercent: b.sharePercent,
    shareAmount: rialStringToTomanString(b.shareAmount),
    paidToEmployee: rialStringToTomanString(b.paid),
    remaining: rialStringToTomanString(b.remaining),
  }));
}

/** Full balance of one employee: totals + per-project breakdown. */
export async function getEmployeeBalance(
  userId: string,
  session: Session,
): Promise<EmployeeBalanceDTO> {
  // Admins may view anyone; an employee may only view their own balance.
  if (session.role !== "ADMIN" && session.sub !== userId) throw PersianErrors.forbidden();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw PersianErrors.notFound("کارمند");

  const projects = await balanceProjectsOf(userId);
  return buildEmployeeBalance(user, projects);
}

/** Balances of every employee (admin only), including unassigned ones. */
export async function listEmployeeBalances(session: Session): Promise<EmployeeBalancesDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();

  const [users, assignments, groups] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.projectAssignment.findMany({
      include: ASSIGNMENT_INCLUDE,
      orderBy: { project: { title: "asc" } },
    }),
    prisma.employeePayment.groupBy({
      by: ["projectId", "userId"],
      _sum: { amount: true },
      _max: { date: true },
    }),
  ]);

  const paidByKey = new Map(groups.map((g) => [`${g.projectId}|${g.userId}`, g]));
  // Totals are derived from the (initially empty) project list, so each row is
  // built first and its totals recomputed after its projects are attached.
  const byUser = new Map(users.map((u) => [u.id, buildEmployeeBalance(u, [])]));

  for (const a of assignments) {
    const balance = byUser.get(a.userId);
    // Skip assignments of non-employee users (never exposed by this module).
    if (!balance) continue;
    const g = paidByKey.get(`${a.projectId}|${a.userId}`);
    balance.projects.push(mapAssignmentToBalance(a, g?._sum.amount ?? 0n, g?._max.date ?? null));
  }

  for (const balance of byUser.values()) {
    Object.assign(balance, sumBalanceTotals(balance.projects));
  }

  return { employees: Array.from(byUser.values()) };
}

/** List employee payments; employees are locked to their own records. */
export async function listEmployeePayments(
  filter: EmployeePaymentFilter,
  session: Session,
): Promise<EmployeePaymentListDTO> {
  const where: Prisma.EmployeePaymentWhereInput = {};

  if (session.role === "EMPLOYEE") {
    where.userId = session.sub;
    if (filter.projectId) {
      // Only payments of projects the employee is actually assigned to.
      const assigned = await prisma.projectAssignment.findUnique({
        where: { projectId_userId: { projectId: filter.projectId, userId: session.sub } },
        select: { id: true },
      });
      if (!assigned) return { payments: [], total: 0 };
      where.projectId = filter.projectId;
    }
  } else {
    if (filter.userId) where.userId = filter.userId;
    if (filter.projectId) where.projectId = filter.projectId;
  }

  const [payments, total] = await Promise.all([
    prisma.employeePayment.findMany({
      where,
      orderBy: { date: "desc" },
      include: EMPLOYEE_PAYMENT_INCLUDE,
    }),
    prisma.employeePayment.count({ where }),
  ]);

  return { payments: payments.map(mapEmployeePaymentToDTO), total };
}

/** Create a payment to an employee (admin only) — must fit their remainder. */
export async function createEmployeePayment(
  input: CreateEmployeePaymentInput,
  session: Session,
): Promise<EmployeePaymentDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();

  const amountRial = tomanStringToRial(input.amount);

  const created = await prisma.$transaction(async (tx) => {
    const assignment = await tx.projectAssignment.findUnique({
      where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
    });
    if (!assignment) throw PersianErrors.employeeNotAssigned();

    const paid = await tx.employeePayment.aggregate({
      where: { projectId: input.projectId, userId: input.userId },
      _sum: { amount: true },
    });
    const remaining = assignment.shareAmount - (paid._sum.amount ?? 0n);
    if (amountRial > remaining) {
      throw PersianErrors.employeePaymentExceedsBalance(tomanLabel(remaining));
    }

    return tx.employeePayment.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        amount: amountRial,
        date: new Date(input.jalaliDate),
        note: input.note ?? "",
      },
      include: EMPLOYEE_PAYMENT_INCLUDE,
    });
  });

  // Notify AFTER the commit, so the employee never sees a rolled-back payment.
  await notifyUser(
    input.userId,
    "SYSTEM",
    `پرداختی به مبلغ ${tomanLabel(amountRial)} تومان از پروژه «${created.project.title}» برای شما ثبت شد.`,
  );

  return mapEmployeePaymentToDTO(created);
}

/** Update a payment (admin only) — the amount is re-checked excluding it. */
export async function updateEmployeePayment(
  id: string,
  input: UpdateEmployeePaymentInput,
  session: Session,
): Promise<EmployeePaymentDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();

  const existing = await getEmployeePaymentOrThrow(id);
  const projectId = input.projectId ?? existing.projectId;
  const userId = input.userId ?? existing.userId;
  const amountRial = input.amount ? tomanStringToRial(input.amount) : existing.amount;

  const updated = await prisma.$transaction(async (tx) => {
    const assignment = await tx.projectAssignment.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!assignment) throw PersianErrors.employeeNotAssigned();

    const others = await tx.employeePayment.aggregate({
      where: { projectId, userId, id: { not: id } },
      _sum: { amount: true },
    });
    const remaining = assignment.shareAmount - (others._sum.amount ?? 0n);
    if (amountRial > remaining) {
      throw PersianErrors.employeePaymentExceedsBalance(tomanLabel(remaining));
    }

    return tx.employeePayment.update({
      where: { id },
      data: {
        ...(input.projectId !== undefined ? { projectId } : {}),
        ...(input.userId !== undefined ? { userId } : {}),
        amount: amountRial,
        ...(input.jalaliDate ? { date: new Date(input.jalaliDate) } : {}),
        ...(input.note !== undefined ? { note: input.note ?? "" } : {}),
      },
      include: EMPLOYEE_PAYMENT_INCLUDE,
    });
  });

  return mapEmployeePaymentToDTO(updated);
}

/** Delete a payment (admin only, hard delete). */
export async function deleteEmployeePayment(
  id: string,
  session: Session,
): Promise<{ id: string }> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();
  await getEmployeePaymentOrThrow(id);
  await prisma.employeePayment.delete({ where: { id } });
  return { id };
}
