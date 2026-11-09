import { ZodError } from "zod";
import { getSession } from "@/core/lib/auth";
import { ok, handleError, PersianErrors, err } from "@/core/lib/api-response";
import { updateInstallment, deleteInstallment } from "@/modules/installments/lib/service";
import { updateInstallmentSchema } from "@/modules/installments/lib/schema";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/installments/[id] — admin only; re-checked against the debt. */
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

    const input = updateInstallmentSchema.parse({ ...body, id });
    const updated = await updateInstallment(id, input, { sub: session.sub, role: session.role });
    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return err(first.message, "INVALID_INPUT", 400);
    }
    return handleError(error);
  }
}

/** DELETE /api/installments/[id] — admin only; forbidden with partial payments. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    if (session.role !== "ADMIN") throw PersianErrors.forbidden();

    const { id } = await params;
    const result = await deleteInstallment(id, { sub: session.sub, role: session.role });
    return ok(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
