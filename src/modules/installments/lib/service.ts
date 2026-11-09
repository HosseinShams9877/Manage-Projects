/**
 * Installments service — scheduled future payments (قسط/چک) from the client.
 * Docs: docs/00-knowledge-layer.md — the client's debt is split into a plan.
 *
 * Rules:
 *  - ADMIN may create/update/delete/pay; employees are read-only spectators
 *    of projects they are assigned to.
 *  - Each scheduled amount may never exceed the client's outstanding debt
 *    (contractPrice − Σ employer payments). The plan is validated per item,
 *    not as a running total — see the "plan constraint" note in
 *    docs/00-knowledge-layer.md.
 *  - A partial payment increments paidAmount and ALSO writes an
 *    EmployerPayment (it is real cash received) — the only cross-table write.
 *  - Due date is always editable, even for a partially-paid installment.
 *  - Deletion is soft (deletedAt) and only allowed while nothing is paid.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/core/lib/prisma";
import { PersianErrors } from "@/core/lib/api-response";
import { addJalaliMonths, formatJalali, formatToman } from "@/core/lib/format";
import { tomanStringToRial } from "@/core/lib/validation";
import { notifyProjectEmployees } from "@/modules/notifications/lib/service";
import type {
  BulkInstallmentsInput,
  CreateInstallmentInput,
  InstallmentDTO,
  InstallmentListDTO,
  PartialPaymentInput,
  ProjectDebtStateDTO,
  UpdateInstallmentInput,
  UpdateDueDateInput,
} from "./schema";
import { mapInstallmentToDTO } from "./mappers";

type Session = { sub: string; role: "ADMIN" | "EMPLOYEE" };

const PROJECT_INCLUDE = { assignments: true } satisfies Prisma.ProjectInclude;
/** Active installments only (soft delete, BR-3). */
const ACTIVE = { deletedAt: null } satisfies Prisma.InstallmentWhereInput;

/** RIAL BigInt → Toman string with separators and Persian digits (no unit). */
function tomanLabel(rial: bigint): string {
  return formatToman(rial, false);
}

/** Fetch a project raw or 404. */
async function getProjectOrThrow(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: PROJECT_INCLUDE,
  });
  if (!project) throw PersianErrors.notFound("پروژه");
  return project;
}

/** Authorize: employees may only see projects they are assigned to. */
function authorizeEmployee(
  project: Prisma.ProjectGetPayload<{ include: typeof PROJECT_INCLUDE }>,
  session: Session,
) {
  if (session.role === "ADMIN") return;
  const assigned = project.assignments.some((a) => a.userId === session.sub);
  if (!assigned) throw PersianErrors.notFound("پروژه");
}

/** Sum the EmployerPayments of a project inside the caller's transaction. */
async function sumEmployerPayments(tx: Prisma.TransactionClient, projectId: string): Promise<bigint> {
  const paid = await tx.employerPayment.aggregate({
    where: { projectId },
    _sum: { amount: true },
  });
  return paid._sum.amount ?? 0n;
}

/** Client's remaining debt (contractPrice − Σ employer payments). */
async function getClientOutstanding(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<bigint> {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { contractPrice: true },
  });
  if (!project) throw PersianErrors.notFound("پروژه");
  const paidByEmployer = await sumEmployerPayments(tx, projectId);
  return project.contractPrice - paidByEmployer;
}

/**
 * Guard one scheduled amount against the client's outstanding debt.
 * Validated per item rather than as a plan total: the outstanding debt shrinks
 * every time the employer pays, so a running-total check would forbid
 * re-planning a project whose plan was drawn against the full contract.
 * DebtSummaryCard still renders an over-allocated plan in red as defensive UI.
 */
async function assertAmountFitsDebt(
  tx: Prisma.TransactionClient,
  projectId: string,
  amount: bigint,
) {
  const clientOutstanding = await getClientOutstanding(tx, projectId);
  if (amount > clientOutstanding) {
    throw PersianErrors.installmentsExceedDebt(tomanLabel(clientOutstanding));
  }
}

/**
 * Debt snapshot of one project.
 * - clientOutstanding = contractPrice − Σ employer payments
 * - unallocated       = clientOutstanding − Σ remaining of the plan
 * - available         = clientOutstanding − Σ amounts of the plan
 */
export async function getProjectDebtState(
  projectId: string,
  session?: Session,
): Promise<ProjectDebtStateDTO> {
  const project = await getProjectOrThrow(projectId);
  if (session) authorizeEmployee(project, session);

  const [paidAgg, planAgg, remainingAgg] = await Promise.all([
    prisma.employerPayment.aggregate({
      where: { projectId },
      _sum: { amount: true },
    }),
    prisma.installment.aggregate({
      where: { projectId, ...ACTIVE },
      _sum: { amount: true },
    }),
    prisma.installment.aggregate({
      where: { projectId, ...ACTIVE, status: { not: "PAID" } },
      _sum: { remaining: true },
    }),
  ]);

  const paidByEmployer = paidAgg._sum.amount ?? 0n;
  const installmentPlanTotal = planAgg._sum.amount ?? 0n;
  const remainingInstallments = remainingAgg._sum.remaining ?? 0n;
  const clientOutstanding = project.contractPrice - paidByEmployer;

  return {
    contractPrice: project.contractPrice.toString(),
    paidByEmployer: paidByEmployer.toString(),
    installmentPlanTotal: installmentPlanTotal.toString(),
    unallocated: (clientOutstanding - remainingInstallments).toString(),
    availableForNewInstallment: (clientOutstanding - installmentPlanTotal).toString(),
  };
}

/** List the installment plan of one project plus its debt snapshot. */
export async function listInstallments(
  projectId: string,
  session: Session,
): Promise<InstallmentListDTO> {
  const project = await getProjectOrThrow(projectId);
  authorizeEmployee(project, session);

  const [installments, debt] = await Promise.all([
    prisma.installment.findMany({
      where: { projectId, ...ACTIVE },
      orderBy: { dueDate: "asc" },
    }),
    getProjectDebtState(projectId),
  ]);

  return {
    installments: installments.map(mapInstallmentToDTO),
    total: installments.length,
    debt,
  };
}

/**
 * Recompute status from the paid/amount pair (PENDING → PARTIAL → PAID).
 * `remaining` on the row is kept in sync with amount − paidAmount.
 */
function statusFor(amount: bigint, paidAmount: bigint): "PENDING" | "PARTIAL" | "PAID" {
  if (paidAmount >= amount) return "PAID";
  if (paidAmount > 0n) return "PARTIAL";
  return "PENDING";
}

/** Create a single installment (admin only). */
export async function createInstallment(
  input: CreateInstallmentInput,
  session: Session,
): Promise<InstallmentDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();
  const amountRial = tomanStringToRial(input.amount);

  const created = await prisma.$transaction(async (tx) => {
    await assertAmountFitsDebt(tx, input.projectId, amountRial);

    return tx.installment.create({
      data: {
        projectId: input.projectId,
        amount: amountRial,
        paidAmount: 0n,
        remaining: amountRial,
        status: "PENDING",
        dueDate: new Date(input.dueDate),
        note: input.note ?? "",
      },
    });
  });

  return mapInstallmentToDTO(created);
}

/** Split a total into N near-equal RIAL parts (the first ones absorb remainder). */
function splitAmount(total: bigint, count: number): bigint[] {
  const base = total / BigInt(count);
  const remainder = total % BigInt(count);
  return Array.from({ length: count }, (_, i) => base + (i < Number(remainder) ? 1n : 0n));
}

/** Create N equal installments spaced `intervalMonths` Jalali months apart. */
export async function bulkCreateInstallments(
  input: BulkInstallmentsInput,
  session: Session,
): Promise<InstallmentListDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();
  const totalRial = tomanStringToRial(input.totalAmount);
  const parts = splitAmount(totalRial, input.count);

  // Jalali month arithmetic is pure math — compute before the transaction.
  const dueDates = parts.map((_, i) => addJalaliMonths(input.firstDueDate, i * input.intervalMonths));
  if (dueDates.some((d) => !d)) {
    throw PersianErrors.badRequest("تاریخ سررسید نامعتبر است.");
  }

  await prisma.$transaction(async (tx) => {
    // Near-equal parts: checking the largest part covers every part.
    const maxPart = parts.reduce((max, part) => (part > max ? part : max), 0n);
    await assertAmountFitsDebt(tx, input.projectId, maxPart);

    await tx.installment.createMany({
      data: parts.map((amount, i) => ({
        projectId: input.projectId,
        amount,
        paidAmount: 0n,
        remaining: amount,
        status: "PENDING" as const,
        dueDate: new Date(dueDates[i] as string),
        note: input.note ?? "",
      })),
    });
  });

  return listInstallments(input.projectId, session);
}

/** Record a partial payment on an installment (admin only). */
export async function recordPartialPayment(
  input: PartialPaymentInput,
  session: Session,
): Promise<InstallmentDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();
  const amountRial = tomanStringToRial(input.amount);

  const result = await prisma.$transaction(async (tx) => {
    const installment = await tx.installment.findFirst({
      where: { id: input.installmentId, ...ACTIVE },
    });
    if (!installment) throw PersianErrors.notFound("قسط");

    const remaining = installment.amount - installment.paidAmount;
    if (amountRial > remaining) {
      throw PersianErrors.paymentExceedsInstallmentRemaining();
    }

    const newPaid = installment.paidAmount + amountRial;
    const status = statusFor(installment.amount, newPaid);
    const updated = await tx.installment.update({
      where: { id: installment.id },
      data: {
        paidAmount: newPaid,
        remaining: installment.amount - newPaid,
        status,
      },
    });

    // Real cash received from the client — mirror it into the employer ledger.
    await tx.employerPayment.create({
      data: {
        projectId: installment.projectId,
        amount: amountRial,
        date: new Date(input.jalaliDate),
        note: input.note && input.note !== "" ? input.note : `پرداخت قسط سررسید ${formatJalali(installment.dueDate)}`,
      },
    });

    return { installment: updated, projectId: installment.projectId, dueDate: installment.dueDate };
  });

  // Notify AFTER the commit so employees never see a rolled-back payment.
  const project = await prisma.project.findUnique({
    where: { id: result.projectId },
    select: { title: true },
  });
  await notifyProjectEmployees(
    result.projectId,
    "EMPLOYER_PAYMENT",
    `قسط ${formatJalali(result.dueDate)} پروژه «${project?.title ?? ""}» به مبلغ ${tomanLabel(amountRial)} تومان پرداخت شد.`,
  );

  return mapInstallmentToDTO(result.installment);
}

/** Update a scheduled installment (admin only) — amount must stay ≥ paidAmount. */
export async function updateInstallment(
  id: string,
  input: UpdateInstallmentInput,
  session: Session,
): Promise<InstallmentDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();

  const existing = await prisma.installment.findFirst({ where: { id, ...ACTIVE } });
  if (!existing) throw PersianErrors.notFound("قسط");

  const amountRial = input.amount ? tomanStringToRial(input.amount) : existing.amount;
  if (amountRial < existing.paidAmount) {
    throw PersianErrors.installmentAmountBelowPaid();
  }

  const updated = await prisma.$transaction(async (tx) => {
    // The scheduled amount may not exceed the client's outstanding debt.
    await assertAmountFitsDebt(tx, existing.projectId, amountRial);

    return tx.installment.update({
      where: { id },
      data: {
        amount: amountRial,
        remaining: amountRial - existing.paidAmount,
        status: statusFor(amountRial, existing.paidAmount),
        ...(input.dueDate ? { dueDate: new Date(input.dueDate) } : {}),
        ...(input.note !== undefined ? { note: input.note ?? "" } : {}),
      },
    });
  });

  return mapInstallmentToDTO(updated);
}

/** Change only the due date (admin only) — always allowed, even when partial. */
export async function updateDueDate(
  id: string,
  input: UpdateDueDateInput,
  session: Session,
): Promise<InstallmentDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();

  const existing = await prisma.installment.findFirst({ where: { id, ...ACTIVE } });
  if (!existing) throw PersianErrors.notFound("قسط");

  const updated = await prisma.installment.update({
    where: { id },
    data: { dueDate: new Date(input.dueDate) },
  });

  return mapInstallmentToDTO(updated);
}

/** Delete an installment (admin only) — only while nothing is paid. Soft delete. */
export async function deleteInstallment(
  id: string,
  session: Session,
): Promise<{ id: string }> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();

  const existing = await prisma.installment.findFirst({ where: { id, ...ACTIVE } });
  if (!existing) throw PersianErrors.notFound("قسط");
  if (existing.paidAmount > 0n) throw PersianErrors.installmentHasPartialPayment();

  await prisma.installment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { id };
}
