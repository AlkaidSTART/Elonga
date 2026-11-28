import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionJwt } from "@/lib/auth/jwt";

function getSafeRedirectPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/login")) {
    return "/";
  }
  return raw;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Auth and healthcheck endpoints are always accessible
  if (pathname.startsWith("/api/auth") || pathname === "/api/health") {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionJwt(token);

  // Logged-in users visiting /login are redirected to target or home
  if (pathname === "/login") {
    if (session) {
      const target = getSafeRedirectPath(request.nextUrl.searchParams.get("redirect"));
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // Protected API routes return 401 JSON when unauthenticated
  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json({ error: "未登录或登录会话已失效，请重新登录" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Protected application routes redirect to /login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    const fullPath = `${pathname}${search}`;
    if (fullPath && fullPath !== "/") {
      loginUrl.searchParams.set("redirect", fullPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif|woff|woff2)$).*)",
  ],
};
