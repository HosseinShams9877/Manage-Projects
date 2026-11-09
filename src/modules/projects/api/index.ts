"use client";

import { api } from "@/core/lib/api-client";
import type {
  ProjectDTO,
  ProjectFormValues,
  ProjectListDTO,
} from "../lib/schema";

/** Convert form values (Toman strings, ISO dates) to the create payload. */
function toPayload(values: ProjectFormValues, partial: boolean) {
  const body: Record<string, unknown> = {};
  if (!partial || values.title !== undefined) body.title = values.title;
  if (!partial || values.description !== undefined) body.description = values.description || "";
  if (!partial || values.clientCompany !== undefined) body.clientCompany = values.clientCompany || "";
  if (!partial || values.contractPrice !== undefined) body.contractPrice = values.contractPrice;
  if (!partial || values.startDate !== undefined) body.startDate = values.startDate || "";
  if (!partial || values.endDate !== undefined) body.endDate = values.endDate || "";
  if (!partial || values.assignments !== undefined) body.assignments = values.assignments;
  return body as Record<string, unknown>;
}

export async function fetchProjects(): Promise<ProjectListDTO> {
  return api.get("/api/projects");
}

export async function fetchProject(id: string): Promise<ProjectDTO> {
  return api.get(`/api/projects/${id}`);
}

export async function createProject(values: ProjectFormValues): Promise<ProjectDTO> {
  return api.post("/api/projects", toPayload(values, false));
}

export async function updateProject(
  id: string,
  values: Partial<ProjectFormValues>,
): Promise<ProjectDTO> {
  return api.patch(`/api/projects/${id}`, toPayload(values as ProjectFormValues, true));
}

export async function deleteProject(id: string): Promise<{ id: string }> {
  return api.del(`/api/projects/${id}`);
}

/** Assignable employees for the admin assignment editor. */
export async function fetchAssignableEmployees(): Promise<{
  employees: { id: string; name: string; email: string }[];
}> {
  return api.get("/api/employees");
}
