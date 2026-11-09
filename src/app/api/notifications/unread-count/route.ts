import { getSession } from "@/core/lib/auth";
import { PersianErrors, handleError, ok } from "@/core/lib/api-response";
import { unreadCount } from "@/modules/notifications/lib/service";

/** GET /api/notifications/unread-count — unread notification count of the current user. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();
    return ok(await unreadCount(session.sub));
  } catch (error) {
    return handleError(error);
  }
}
