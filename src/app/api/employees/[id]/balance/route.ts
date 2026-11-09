import { getSession } from "@/core/lib/auth";
import { PersianErrors, handleError, ok } from "@/core/lib/api-response";
import { getEmployeeBalance } from "@/modules/employee-payments/lib/service";

type Params = { params: Promise<{ id: string }> };

/** GET /api/employees/[id]/balance — admins, or the employee themselves. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const { id } = await params;
    const balance = await getEmployeeBalance(id, { sub: session.sub, role: session.role });
    return ok(balance);
  } catch (error) {
    return handleError(error);
  }
}
