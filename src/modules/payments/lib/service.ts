/**
 * Payments service — employer payments (actual cash received from the client).
 * Docs: docs/00-knowledge-layer.md — outstanding debt = contractPrice − Σ payments.
 *
 * Rules:
 *  - ADMIN may create/update/delete; employees are read-only spectators of
 *    projects they are assigned to.
 *  - A payment can never exceed the client's outstanding debt.
 *  - Creating a payment notifies every assigned employee.
 *  - Money is RIAL BigInt; the client sends TOMAN strings (×10 here).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/core/lib/prisma";
import { PersianErrors } from "@/core/lib/api-response";
import { formatToman } from "@/core/lib/format";
import { tomanStringToRial } from "@/core/lib/validation";
import { notifyProjectEmployees } from "@/modules/notifications/lib/service";
import type {
  CreateEmployerPaymentInput,
  EmployerPaymentDTO,
  EmployerPaymentListDTO,
  UpdateEmployerPaymentInput,
} from "./schema";
import { mapPaymentToDTO } from "./mappers";

type Session = { sub: string; role: "ADMIN" | "EMPLOYEE" };

const PROJECT_INCLUDE = { assignments: true } satisfies Prisma.ProjectInclude;

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

/** Fetch a payment raw or 404. */
async function getPaymentOrThrow(id: string) {
  const payment = await prisma.employerPayment.findUnique({
    where: { id },
    include: { project: { select: { id: true, title: true, contractPrice: true } } },
  });
  if (!payment) throw PersianErrors.notFound("پرداخت");
  return payment;
}

/** List payments of one project (assigned employees see them all; admin too). */
export async function listPaymentsByProject(
  projectId: string,
  session: Session,
): Promise<EmployerPaymentListDTO> {
  const project = await getProjectOrThrow(projectId);
  authorizeEmployee(project, session);

  const payments = await prisma.employerPayment.findMany({
    where: { projectId },
    orderBy: { date: "asc" },
  });

  return { payments: payments.map(mapPaymentToDTO), total: payments.length };
}

/** Create a payment (admin only) — must fit the client's outstanding debt. */
export async function createPayment(
  input: CreateEmployerPaymentInput,
  session: Session,
): Promise<EmployerPaymentDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();

  const amountRial = tomanStringToRial(input.amount);

  // Lock the project row first; all debt math must happen inside one tx.
  const created = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, title: true, contractPrice: true },
    });
    if (!project) throw PersianErrors.notFound("پروژه");

    const paid = await tx.employerPayment.aggregate({
      where: { projectId: input.projectId },
      _sum: { amount: true },
    });
    const remaining = project.contractPrice - (paid._sum.amount ?? 0n);
    if (amountRial > remaining) {
      throw PersianErrors.paymentExceedsDebt(tomanLabel(remaining));
    }

    const payment = await tx.employerPayment.create({
      data: {
        projectId: input.projectId,
        amount: amountRial,
        date: new Date(input.jalaliDate),
        note: input.note ?? "",
      },
    });
    return { payment, title: project.title };
  });

  // Notify AFTER the commit so employees never see a rolled-back payment.
  await notifyProjectEmployees(
    input.projectId,
    "EMPLOYER_PAYMENT",
    `پرداخت ${tomanLabel(amountRial)} تومان از پروژه «${created.title}» ثبت شد.`,
  );

  return mapPaymentToDTO(created.payment);
}

/** Update a payment (admin only) — re-checked against the other payments. */
export async function updatePayment(
  id: string,
  input: UpdateEmployerPaymentInput,
  session: Session,
): Promise<EmployerPaymentDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();
  const existing = await getPaymentOrThrow(id);
  const amountRial = input.amount ? tomanStringToRial(input.amount) : existing.amount;

  const updated = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: existing.projectId },
      select: { id: true, contractPrice: true },
    });
    if (!project) throw PersianErrors.notFound("پروژه");

    const others = await tx.employerPayment.aggregate({
      where: { projectId: existing.projectId, id: { not: id } },
      _sum: { amount: true },
    });
    const remaining = project.contractPrice - (others._sum.amount ?? 0n);
    if (amountRial > remaining) {
      throw PersianErrors.paymentExceedsDebt(tomanLabel(remaining));
    }

    return tx.employerPayment.update({
      where: { id },
      data: {
        amount: amountRial,
        ...(input.jalaliDate ? { date: new Date(input.jalaliDate) } : {}),
        ...(input.note !== undefined ? { note: input.note ?? "" } : {}),
      },
    });
  });

  return mapPaymentToDTO(updated);
}

/** Delete a payment (admin only). */
export async function deletePayment(
  id: string,
  session: Session,
): Promise<{ id: string }> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();
  await getPaymentOrThrow(id);
  await prisma.employerPayment.delete({ where: { id } });
  return { id };
}
