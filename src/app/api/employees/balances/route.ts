import { getSession } from "@/core/lib/auth";
import { PersianErrors, handleError, ok } from "@/core/lib/api-response";
import { listEmployeeBalances } from "@/modules/employee-payments/lib/service";

/** GET /api/employees/balances — admin-only overview of every employee's balance. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    if (session.role !== "ADMIN") throw PersianErrors.forbidden();

    const balances = await listEmployeeBalances({ sub: session.sub, role: session.role });
    return ok(balances);
  } catch (error) {
    return handleError(error);
  }
}
