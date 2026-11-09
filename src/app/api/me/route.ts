import { prisma } from "@/core/lib/prisma";
import { getSession } from "@/core/lib/auth";
import { ok, handleError, PersianErrors } from "@/core/lib/api-response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw PersianErrors.unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) throw PersianErrors.notFound("کاربر");

    return ok({ user });
  } catch (error) {
    return handleError(error);
  }
}
