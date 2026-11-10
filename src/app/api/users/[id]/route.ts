import { getSession } from "@/core/lib/auth";
import { PersianErrors, handleError, ok } from "@/core/lib/api-response";
import { updateUserSchema } from "@/modules/users/lib/schema";
import { deleteUser, updateUser } from "@/modules/users/lib/service";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/users/[id] — update a user. Body: { name?, email?, password?, role? }.
 * An absent password keeps the stored hash. Admin only.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const { id } = await params;
    if (!id) throw PersianErrors.notFound("کارمند");

    const body: unknown = await request.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      throw PersianErrors.badRequest(parsed.error.issues[0]?.message ?? "ورودی‌ها نامعتبر است.");
    }

    const updated = await updateUser(id, parsed.data, { sub: session.sub, role: session.role });
    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/users/[id] — delete a user. Admin only. The service refuses:
 *  - your own account («شما نمی‌توانید حساب کاربری خود را حذف کنید.»)
 *  - a user still referenced by assignments or payments.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const { id } = await params;
    if (!id) throw PersianErrors.notFound("کارمند");

    const result = await deleteUser(id, { sub: session.sub, role: session.role });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
