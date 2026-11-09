import { ZodError } from "zod";
import { getSession } from "@/core/lib/auth";
import { ok, handleError, PersianErrors, err } from "@/core/lib/api-response";
import {
  listProjects,
  createProject,
} from "@/modules/projects/lib/service";
import {
  createProjectSchema,
} from "@/modules/projects/lib/schema";

/** GET /api/projects — ADMIN: all; EMPLOYEE: only assigned projects. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const result = await listProjects({
      sub: session.sub,
      role: session.role,
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

/** POST /api/projects — admin only. Creates project + share assignments. */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    if (session.role !== "ADMIN") throw PersianErrors.forbidden();

    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return err("بدنه درخواست نامعتبر است.", "INVALID_INPUT", 400);
    }

    const input = createProjectSchema.parse(body);
    const created = await createProject(input, {
      sub: session.sub,
      role: session.role,
    });
    return ok(created, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return err(first.message, "INVALID_INPUT", 400);
    }
    return handleError(error);
  }
}
