/**
 * Mappers for the employee payments module. Prisma rows → API DTOs.
 * BigInt money is stringified here; nothing else touches JSON serialization.
 */

import type { Prisma } from "@prisma/client";
import type {
  EmployeeBalanceDTO,
  EmployeePaymentDTO,
  EmployeeProjectBalanceDTO,
} from "./schema";

/** Relations every employee payment query includes (for titles/names). */
export const EMPLOYEE_PAYMENT_INCLUDE = {
  project: { select: { title: true } },
  user: { select: { name: true } },
} satisfies Prisma.EmployeePaymentInclude;

export type EmployeePaymentWithRelations = Prisma.EmployeePaymentGetPayload<{
  include: typeof EMPLOYEE_PAYMENT_INCLUDE;
}>;

/** Relations every balance query includes for the assignment rows. */
export const ASSIGNMENT_INCLUDE = {
  project: { select: { title: true } },
} satisfies Prisma.ProjectAssignmentInclude;

export type AssignmentWithProject = Prisma.ProjectAssignmentGetPayload<{
  include: typeof ASSIGNMENT_INCLUDE;
}>;

export function mapEmployeePaymentToDTO(p: EmployeePaymentWithRelations): EmployeePaymentDTO {
  return {
    id: p.id,
    projectId: p.projectId,
    projectTitle: p.project.title,
    userId: p.userId,
    userName: p.user.name,
    amount: p.amount.toString(),
    // Date-only ISO: the picker and schema both work with YYYY-MM-DD.
    jalaliDate: p.date.toISOString().slice(0, 10),
    note: p.note,
    createdAt: p.createdAt.toISOString(),
  };
}

/** One assignment + its aggregated payments → one balance row. */
export function mapAssignmentToBalance(
  a: AssignmentWithProject,
  paid: bigint,
  lastPaymentDate: Date | null,
): EmployeeProjectBalanceDTO {
  return {
    projectId: a.projectId,
    title: a.project.title,
    sharePercent: a.sharePercent,
    shareAmount: a.shareAmount.toString(),
    paid: paid.toString(),
    remaining: (a.shareAmount - paid).toString(),
    // Date-only ISO (displayed with formatJalali), or null when nothing is paid.
    lastPaymentDate: lastPaymentDate ? lastPaymentDate.toISOString().slice(0, 10) : null,
  };
}

/** Sum a list of per-project balance rows into the three RIAL totals. */
export function sumBalanceTotals(projects: EmployeeProjectBalanceDTO[]): {
  totalShare: string;
  totalPaid: string;
  totalRemaining: string;
} {
  const totalShare = projects.reduce((sum, p) => sum + BigInt(p.shareAmount), 0n);
  const totalPaid = projects.reduce((sum, p) => sum + BigInt(p.paid), 0n);
  return {
    totalShare: totalShare.toString(),
    totalPaid: totalPaid.toString(),
    totalRemaining: (totalShare - totalPaid).toString(),
  };
}

/** Assemble one employee's full balance DTO. */
export function buildEmployeeBalance(
  user: { id: string; name: string; email: string; role: "ADMIN" | "EMPLOYEE" },
  projects: EmployeeProjectBalanceDTO[],
): EmployeeBalanceDTO {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ...sumBalanceTotals(projects),
    projects,
  };
}
