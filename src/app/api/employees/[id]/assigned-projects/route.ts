import { getSession } from "@/core/lib/auth";
import { PersianErrors, handleError, ok } from "@/core/lib/api-response";
import { listAssignedProjectsForEmployee } from "@/modules/employee-payments/lib/service";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/employees/[id]/assigned-projects — the employee's assigned projects
 * with their share percent/amount and remaining share. Money is TOMAN strings.
 * Admins, or the employee themselves (fix-up patch; additive to Phase 4).
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const { id } = await params;
    const projects = await listAssignedProjectsForEmployee(id, {
      sub: session.sub,
      role: session.role,
    });
    return ok(projects);
  } catch (error) {
    return handleError(error);
  }
}
