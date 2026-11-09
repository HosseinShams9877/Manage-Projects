/**
 * Prisma row → DTO mappers for the Projects module.
 * BigInts are serialized as strings (BigInt is not JSON-safe), dates stay ISO
 * and are rendered Jalali in the UI layer (core/lib/format.ts).
 */

import type { Prisma } from "@prisma/client";
import type { ProjectDTO, AssignmentDTO } from "./schema";

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    assignments: { include: { user: true } };
    employerPayments: true;
  };
}>;

/**
 * Map one project to its DTO.
 * @param includeSensitive when false, strip every assignment except the one
 * belonging to `currentUserId` (employee read-only view). An employee never
 * sees another employee's share or the full assignment list.
 */
export function mapProjectToDTO(
  project: ProjectWithRelations,
  options: {
    role: "ADMIN" | "EMPLOYEE";
    currentUserId: string;
  },
): ProjectDTO {
  const { role, currentUserId } = options;
  const isAdmin = role === "ADMIN";

  const paidAmount = project.employerPayments.reduce(
    (acc, p) => acc + p.amount,
    0n,
  );

  let remainingAmount = project.contractPrice - paidAmount;
  if (remainingAmount < 0n) remainingAmount = 0n;

  const progressPercent =
    project.contractPrice > 0n
      ? Math.min(
          Math.max(Number((paidAmount * 1000n) / project.contractPrice) / 10, 0),
          100,
        )
      : 0;

  const allAssignments: AssignmentDTO[] = project.assignments.map((a) => ({
    id: a.id,
    userId: a.userId,
    userName: a.user.name,
    userEmail: a.user.email,
    sharePercent: a.sharePercent,
    shareAmount: a.shareAmount.toString(),
  }));

  const visibleAssignments = isAdmin
    ? allAssignments
    : allAssignments.filter((a) => a.userId === currentUserId);

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    clientCompany: project.clientCompany,
    contractPrice: project.contractPrice.toString(),
    startDate: project.startDate ? project.startDate.toISOString() : null,
    endDate: project.endDate ? project.endDate.toISOString() : null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    paidAmount: paidAmount.toString(),
    remainingAmount: remainingAmount.toString(),
    progressPercent,
    assignments: visibleAssignments,
    canEdit: isAdmin,
    canDelete: isAdmin,
  };
}
