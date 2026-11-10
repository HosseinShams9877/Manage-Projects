import { getSession } from "@/core/lib/auth";
import { PersianErrors, handleError, ok } from "@/core/lib/api-response";
import { createUserSchema } from "@/modules/users/lib/schema";
import { createUser, listUsers } from "@/modules/users/lib/service";

/**
 * GET /api/users — every user (id, name, email, role, createdAt). Admin only;
 * the service enforces the role and returns 403 for anyone else.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const users = await listUsers({ sub: session.sub, role: session.role });
    return ok(users);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/users — create a user. Body: { name, email, password, role }.
 * Email uniqueness and bcrypt hashing live in the service.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const body: unknown = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      throw PersianErrors.badRequest(parsed.error.issues[0]?.message ?? "ورودی‌ها نامعتبر است.");
    }

    const created = await createUser(parsed.data, { sub: session.sub, role: session.role });
    return ok(created, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
