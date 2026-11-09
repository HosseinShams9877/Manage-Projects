import { ZodError } from "zod";
import { getSession } from "@/core/lib/auth";
import { PersianErrors, err, handleError, ok } from "@/core/lib/api-response";
import {
  createEmployeePayment,
  listEmployeePayments,
} from "@/modules/employee-payments/lib/service";
import { createEmployeePaymentSchema } from "@/modules/employee-payments/lib/schema";

/** GET /api/employee-payments — admins see everything; employees see their own. */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? undefined;
    const projectId = searchParams.get("projectId") ?? undefined;

    const list = await listEmployeePayments(
      userId || projectId ? { userId, projectId } : {},
      { sub: session.sub, role: session.role },
    );
    return ok(list);
  } catch (error) {
    return handleError(error);
  }
}

/** POST /api/employee-payments — admin only. */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    if (session.role !== "ADMIN") throw PersianErrors.forbidden();

    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return err("بدنه درخواست نامعتبر است.", "INVALID_INPUT", 400);
    }

    const input = createEmployeePaymentSchema.parse(body);
    const created = await createEmployeePayment(input, { sub: session.sub, role: session.role });
    return ok(created, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return err(first.message, "INVALID_INPUT", 400);
    }
    return handleError(error);
  }
}
