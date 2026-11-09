/**
 * Projects module service layer — all Prisma access lives here.
 * Docs: docs/02-architecture.md (API route → service mapping).
 *
 * Rules (docs/00-knowledge-layer.md):
 *  - ADMIN sees all projects; EMPLOYEE only projects they are assigned to.
 *  - An employee never sees another employee's share or payment data.
 *  - Sum of sharePercent per project MUST equal exactly 100 (BR-2).
 *  - shareAmount is derived from contractPrice at write time (BR-2).
 *  - Money is RIAL BigInt; the client sends TOMAN strings (×10 here).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/core/lib/prisma";
import { PersianErrors } from "@/core/lib/api-response";
import type {
  CreateProjectInput,
  ProjectDTO,
  ProjectListDTO,
  UpdateProjectInput,
} from "./schema";
import { mapProjectToDTO } from "./mappers";

const PROJECT_INCLUDE = {
  assignments: { include: { user: true } },
  employerPayments: true,
} satisfies Prisma.ProjectInclude;

type Session = { sub: string; role: "ADMIN" | "EMPLOYEE" };

/** TOMAN string (with possible separators) → RIAL BigInt. */
export function tomanStringToRial(input: string): bigint {
  const cleaned = input.replace(/[,\s٬]/g, "");
  return BigInt(cleaned) * 10n;
}

/** Total percent across assignment rows. */
export function sumShares(rows: { sharePercent: number }[]): number {
  return rows.reduce((acc, r) => acc + r.sharePercent, 0);
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

/** Authorize: employees may only touch projects they are assigned to. */
function authorizeEmployee(
  project: Prisma.ProjectGetPayload<{ include: typeof PROJECT_INCLUDE }>,
  session: Session,
) {
  if (session.role === "ADMIN") return;
  const assigned = project.assignments.some((a) => a.userId === session.sub);
  if (!assigned) throw PersianErrors.notFound("پروژه");
}

/** List: ADMIN → all, EMPLOYEE → only assigned. */
export async function listProjects(session: Session): Promise<ProjectListDTO> {
  const where =
    session.role === "ADMIN"
      ? {}
      : { assignments: { some: { userId: session.sub } } };

  const projects = await prisma.project.findMany({
    where,
    include: PROJECT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  const dtos = projects.map((p) => mapProjectToDTO(p, { role: session.role, currentUserId: session.sub }));
  return { projects: dtos, total: dtos.length };
}

/** Single project with role-based visibility. */
export async function getProject(
  id: string,
  session: Session,
): Promise<ProjectDTO> {
  const project = await getProjectOrThrow(id);
  authorizeEmployee(project, session);
  return mapProjectToDTO(project, { role: session.role, currentUserId: session.sub });
}

/** Create project + assignments in one transaction (BR-2: shares = 100). */
export async function createProject(
  input: CreateProjectInput,
  session: Session,
): Promise<ProjectDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();

  const contractPrice = tomanStringToRial(input.contractPrice);
  const assignments = input.assignments;

  const total = sumShares(assignments);
  if (total !== 100) throw PersianErrors.sharesMustEqual100(total);

  if (input.startDate && input.endDate && new Date(input.endDate) < new Date(input.startDate)) {
    throw PersianErrors.invalidInput();
  }

  const created = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        title: input.title,
        description: input.description ?? "",
        clientCompany: input.clientCompany ?? "",
        contractPrice,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        assignments: {
          create: assignments.map((a) => ({
            userId: a.userId,
            sharePercent: a.sharePercent,
            shareAmount: (contractPrice * BigInt(a.sharePercent)) / 100n,
          })),
        },
      },
      include: PROJECT_INCLUDE,
    });

    return project;
  });

  return mapProjectToDTO(created, { role: session.role, currentUserId: session.sub });
}

/** Partial update; assignments (if present) fully replace existing rows. */
export async function updateProject(
  id: string,
  input: UpdateProjectInput,
  session: Session,
): Promise<ProjectDTO> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();

  const existing = await getProjectOrThrow(id);
  const contractPrice = input.contractPrice
    ? tomanStringToRial(input.contractPrice)
    : existing.contractPrice;

  const assignments = input.assignments;
  if (assignments) {
    const total = sumShares(assignments);
    if (total !== 100) throw PersianErrors.sharesMustEqual100(total);
  }

  if (input.startDate && input.endDate && new Date(input.endDate) < new Date(input.startDate)) {
    throw PersianErrors.invalidInput();
  }

  const updated = await prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.clientCompany !== undefined ? { clientCompany: input.clientCompany } : {}),
        ...(input.contractPrice !== undefined ? { contractPrice } : {}),
        ...(input.startDate !== undefined
          ? { startDate: input.startDate ? new Date(input.startDate) : null }
          : {}),
        ...(input.endDate !== undefined
          ? { endDate: input.endDate ? new Date(input.endDate) : null }
          : {}),
      },
      include: PROJECT_INCLUDE,
    });

    if (assignments) {
      await tx.projectAssignment.deleteMany({ where: { projectId: id } });
      await tx.projectAssignment.createMany({
        data: assignments.map((a) => ({
          projectId: id,
          userId: a.userId,
          sharePercent: a.sharePercent,
          shareAmount: (contractPrice * BigInt(a.sharePercent)) / 100n,
        })),
      });
      return await tx.project.findUniqueOrThrow({
        where: { id },
        include: PROJECT_INCLUDE,
      });
    }

    return project;
  });

  return mapProjectToDTO(updated, { role: session.role, currentUserId: session.sub });
}

/** Cascade delete (assignments/payments/installments follow via schema). */
export async function deleteProject(
  id: string,
  session: Session,
): Promise<{ id: string }> {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();
  await getProjectOrThrow(id);
  await prisma.project.delete({ where: { id } });
  return { id };
}

/** All employees that can be assigned to a project (admin assignment editor). */
export async function listAssignableEmployees(session: Session) {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();
  const users = await prisma.user.findMany({
    where: { role: "EMPLOYEE", active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  return users;
}
