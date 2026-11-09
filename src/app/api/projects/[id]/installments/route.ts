import { ZodError } from "zod";
import { getSession } from "@/core/lib/auth";
import { ok, handleError, PersianErrors, err } from "@/core/lib/api-response";
import {
  listInstallments,
  createInstallment,
  bulkCreateInstallments,
} from "@/modules/installments/lib/service";
import { createInstallmentSchema, bulkInstallmentsSchema } from "@/modules/installments/lib/schema";

type Params = { params: Promise<{ id: string }> };

/** GET /api/projects/[id]/installments — assigned employees see all; admin too. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const { id } = await params;
    const result = await listInstallments(id, { sub: session.sub, role: session.role });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/projects/[id]/installments — admin only.
 * `?mode=bulk` creates N near-equal installments; otherwise a single one.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    if (session.role !== "ADMIN") throw PersianErrors.forbidden();

    const { id } = await params;
    const isBulk = new URL(request.url).searchParams.get("mode") === "bulk";

    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return err("بدنه درخواست نامعتبر است.", "INVALID_INPUT", 400);
    }

    if (isBulk) {
      const input = bulkInstallmentsSchema.parse({ ...body, projectId: id });
      const created = await bulkCreateInstallments(input, {
        sub: session.sub,
        role: session.role,
      });
      return ok(created, { status: 201 });
    }

    const input = createInstallmentSchema.parse({ ...body, projectId: id });
    const created = await createInstallment(input, { sub: session.sub, role: session.role });
    return ok(created, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return err(first.message, "INVALID_INPUT", 400);
    }
    return handleError(error);
  }
}
