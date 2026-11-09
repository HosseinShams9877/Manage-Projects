import { ZodError } from "zod";
import { getSession } from "@/core/lib/auth";
import { ok, handleError, PersianErrors, err } from "@/core/lib/api-response";
import { recordPartialPayment } from "@/modules/installments/lib/service";
import { partialPaymentSchema } from "@/modules/installments/lib/schema";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/installments/[id]/pay — admin only. Records a partial payment,
 * mirrors it into EmployerPayment, and flips the status to PAID when settled.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    if (session.role !== "ADMIN") throw PersianErrors.forbidden();

    const { id } = await params;
    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return err("بدنه درخواست نامعتبر است.", "INVALID_INPUT", 400);
    }

    const input = partialPaymentSchema.parse({ ...body, installmentId: id });
    const updated = await recordPartialPayment(input, { sub: session.sub, role: session.role });
    return ok(updated, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return err(first.message, "INVALID_INPUT", 400);
    }
    return handleError(error);
  }
}
