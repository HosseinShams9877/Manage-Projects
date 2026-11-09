import { ZodError } from "zod";
import { getSession } from "@/core/lib/auth";
import { PersianErrors, err, handleError, ok } from "@/core/lib/api-response";
import {
  listMyNotifications,
  markAllRead,
} from "@/modules/notifications/lib/service";
import { markAllReadSchema } from "@/modules/notifications/lib/schema";

/**
 * GET /api/notifications — the current user's notifications, newest first.
 * Query params: `unreadOnly=true` filters to unread rows, `limit=N` caps the
 * list (the total in the response still reflects the same filter).
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly");
    const limitParam = searchParams.get("limit");

    const limit =
      limitParam !== null ? Math.max(1, Math.min(100, Number(limitParam))) : undefined;
    if (limitParam !== null && !Number.isFinite(limit)) {
      throw PersianErrors.badRequest("مقدار limit نامعتبر است.");
    }

    const list = await listMyNotifications(
      { sub: session.sub, role: session.role },
      {
        unreadOnly: unreadOnly === "true",
        limit,
      },
    );
    return ok(list);
  } catch (error) {
    return handleError(error);
  }
}

/** PATCH /api/notifications — mark every unread notification of the current user as read. */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return err("بدنه درخواست نامعتبر است.", "INVALID_INPUT", 400);
    }

    markAllReadSchema.parse(body);
    const result = await markAllRead(session.sub);
    return ok(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return err(first.message, "INVALID_INPUT", 400);
    }
    return handleError(error);
  }
}
