import { ZodError } from "zod";
import { getSession } from "@/core/lib/auth";
import { ok, handleError, PersianErrors, err } from "@/core/lib/api-response";
import { listPaymentsByProject, createPayment } from "@/modules/payments/lib/service";
import { createEmployerPaymentSchema } from "@/modules/payments/lib/schema";

type Params = { params: Promise<{ id: string }> };

/** GET /api/projects/[id]/payments — assigned employees see all; admin too. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const { id } = await params;
    const result = await listPaymentsByProject(id, { sub: session.sub, role: session.role });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

/** POST /api/projects/[id]/payments — admin only; must fit the outstanding debt. */
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

    const input = createEmployerPaymentSchema.parse({ ...body, projectId: id });
    const created = await createPayment(input, { sub: session.sub, role: session.role });
    return ok(created, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return err(first.message, "INVALID_INPUT", 400);
    }
    return handleError(error);
  }
}
