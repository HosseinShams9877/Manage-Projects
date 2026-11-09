import { getSession } from "@/core/lib/auth";
import { PersianErrors, handleError, ok } from "@/core/lib/api-response";
import { getAdminDashboardStats } from "@/modules/dashboard/lib/service";

/**
 * GET /api/dashboard/admin — admin-only aggregate summary (Phase 6 §1).
 * Read-only; the client keeps it fresh with React Query (staleTime 30s).
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    if (session.role !== "ADMIN") throw PersianErrors.forbidden();

    return ok(await getAdminDashboardStats());
  } catch (error) {
    return handleError(error);
  }
}
