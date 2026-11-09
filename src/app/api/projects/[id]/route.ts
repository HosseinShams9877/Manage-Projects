import { ZodError } from "zod";
import { getSession } from "@/core/lib/auth";
import { ok, handleError, PersianErrors, err } from "@/core/lib/api-response";
import {
  getProject,
  updateProject,
  deleteProject,
} from "@/modules/projects/lib/service";
import { updateProjectSchema } from "@/modules/projects/lib/schema";

type Params = { params: Promise<{ id: string }> };

/** GET /api/projects/[id] — employee must be assigned to see it. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const { id } = await params;
    const project = await getProject(id, { sub: session.sub, role: session.role });
    return ok(project);
  } catch (error) {
    return handleError(error);
  }
}

/** PATCH /api/projects/[id] — admin only, partial update. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    if (session.role !== "ADMIN") throw PersianErrors.forbidden();

    const { id } = await params;
    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return err("بدنه درخواست نامعتبر است.", "INVALID_INPUT", 400);
    }

    const input = updateProjectSchema.parse(body);
    const updated = await updateProject(id, input, {
      sub: session.sub,
      role: session.role,
    });
    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return err(first.message, "INVALID_INPUT", 400);
    }
    return handleError(error);
  }
}

/** DELETE /api/projects/[id] — admin only, cascade. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    if (session.role !== "ADMIN") throw PersianErrors.forbidden();

    const { id } = await params;
    const result = await deleteProject(id, {
      sub: session.sub,
      role: session.role,
    });
    return ok(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
