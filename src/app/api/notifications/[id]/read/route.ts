import { ZodError } from "zod";
import { getSession } from "@/core/lib/auth";
import { PersianErrors, err, handleError, ok } from "@/core/lib/api-response";
import { markRead } from "@/modules/notifications/lib/service";
import { markReadSchema } from "@/modules/notifications/lib/schema";

/**
 * POST /api/notifications/[id]/read — mark one notification as read.
 * Only the notification's owner may do this; anybody else gets a 404 so the
 * existence of another user's row is never leaked.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const { id } = await params;

    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return err("بدنه درخواست نامعتبر است.", "INVALID_INPUT", 400);
    }

    const input = markReadSchema.parse({ ...body, id });
    const result = await markRead(input.id, session.sub);
    return ok(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return err(first.message, "INVALID_INPUT", 400);
    }
    return handleError(error);
  }
}
