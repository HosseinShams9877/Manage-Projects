import { getSession } from "@/core/lib/auth";
import { ok, handleError, PersianErrors } from "@/core/lib/api-response";
import { listAssignableEmployees } from "@/modules/projects/lib/service";

/**
 * GET /api/employees — admin-only list of assignable employees.
 * Feeds the project AssignmentEditor. (Full employees module: docs phase 5.)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const users = await listAssignableEmployees({
      sub: session.sub,
      role: session.role,
    });
    return ok({ employees: users });
  } catch (error) {
    return handleError(error);
  }
}
