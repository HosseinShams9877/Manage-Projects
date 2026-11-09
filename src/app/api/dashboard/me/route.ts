import {getSession} from "@/core/lib/auth";
import {PersianErrors, handleError, ok} from "@/core/lib/api-response";
import {getEmployeeDashboardStats} from "@/modules/dashboard/lib/service";

/**
 * GET /api/dashboard/me — the signed-in user's own dashboard additions
 * (Phase 6 §2): received-this-month + my upcoming installments.
 * An employee can only ever fetch their own row; admins get an empty
 * employee view (they have no assignments).
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    if (session.role !== "EMPLOYEE") throw PersianErrors.forbidden();

    return ok(
      await getEmployeeDashboardStats(session.sub, { sub: session.sub, role: session.role }),
    );
  } catch (error) {
    return handleError(error);
  }
}
