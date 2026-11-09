import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/core/lib/prisma";
import {
  AUTH_COOKIE,
  SESSION_MAX_AGE,
  createSession,
} from "@/core/lib/auth";
import { ok, err, handleError } from "@/core/lib/api-response";

const loginSchema = z.object({
  email: z.string().email("ایمیل معتبر نیست."),
  password: z.string().min(1, "رمز عبور را وارد کنید."),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user || !user.active) {
      return err("ایمیل یا رمز عبور نادرست است.", "INVALID_CREDENTIALS", 401);
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return err("ایمیل یا رمز عبور نادرست است.", "INVALID_CREDENTIALS", 401);
    }

    const token = await createSession({
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    const response = ok({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    response.headers.set(
      "Set-Cookie",
      `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`,
    );
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(error.issues[0]?.message ?? "ورودی نامعتبر است.", "INVALID_INPUT", 422);
    }
    return handleError(error);
  }
}
