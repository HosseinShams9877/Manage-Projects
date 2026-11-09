import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifySession } from "@/core/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes + Next internals.
  if (isPublic(pathname) || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const session = await verifySession(token);

  // Not authenticated → send to login (for pages) or 401 (for API).
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: { message: "دسترسی غیرمجاز است.", code: "UNAUTHORIZED" } },
        { status: 401 },
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Role-based protection.
  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    const home = request.nextUrl.clone();
    home.pathname = "/me";
    return NextResponse.redirect(home);
  }
  if (pathname.startsWith("/me") && session.role !== "EMPLOYEE") {
    const home = request.nextUrl.clone();
    home.pathname = "/admin";
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect everything except static assets & the login API.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
