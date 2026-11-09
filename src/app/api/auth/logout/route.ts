import { AUTH_COOKIE } from "@/core/lib/auth";
import { ok } from "@/core/lib/api-response";

export async function POST() {
  const response = ok({ success: true });
  response.headers.set(
    "Set-Cookie",
    `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return response;
}
