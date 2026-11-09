/**
 * Lightweight JWT-cookie auth (edge-compatible via jose).
 * Docs: docs/00-knowledge-layer.md §8.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

export const AUTH_COOKIE = "auth-token";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type Role = "ADMIN" | "EMPLOYEE";

export interface SessionUser extends JWTPayload {
  sub: string;
  role: Role;
  name: string;
  email: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET تنظیم نشده یا ضعیف است. حداقل ۱۶ کاراکتر در .env قرار دهید.",
    );
  }
  return new TextEncoder().encode(secret);
}

/** Create a signed session cookie value. */
export async function createSession(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

/** Verify a raw token string (used in middleware & route handlers). */
export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const p = payload as SessionUser;
    if (!p.sub || !p.role) return null;
    return p;
  } catch {
    return null;
  }
}

/** Read+verify session from cookies — for Server Components / route handlers. */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(AUTH_COOKIE)?.value);
}

/** Require an authenticated session or return null. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("دسترسی غیرمجاز است.");
  }
  return session;
}

/** Require an ADMIN session. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    throw new Error("شما اجازه انجام این عمل را ندارید.");
  }
  return session;
}

export const SESSION_MAX_AGE = SESSION_MAX_AGE_SECONDS;
