import { ZodError } from "zod";
import { getSession } from "@/core/lib/auth";
import { PersianErrors, err, handleError, ok } from "@/core/lib/api-response";
import {
  deleteEmployeePayment,
  updateEmployeePayment,
} from "@/modules/employee-payments/lib/service";
import { updateEmployeePaymentSchema } from "@/modules/employee-payments/lib/schema";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/employee-payments/[id] — admin only; re-validates the remainder. */
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

    const input = updateEmployeePaymentSchema.parse({ ...body, id });
    const updated = await updateEmployeePayment(input.id, input, {
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

/** DELETE /api/employee-payments/[id] — admin only. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    if (session.role !== "ADMIN") throw PersianErrors.forbidden();

    const { id } = await params;
    const deleted = await deleteEmployeePayment(id, { sub: session.sub, role: session.role });
    return ok(deleted);
  } catch (error) {
    return handleError(error);
  }
}
