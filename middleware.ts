import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminPath, isUserPath } from "@/config/routesAccess";

const SESSION_COOKIE = "snt_session";

type SessionRole = "user" | "admin" | "board";

const readSessionRole = (
  request: NextRequest
): { role: SessionRole | null; hasSession: boolean } => {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return { role: null, hasSession: false };
  try {
    const parsed = JSON.parse(raw) as { role?: SessionRole };
    const role: SessionRole = parsed.role ?? "user";
    return { role, hasSession: true };
  } catch {
    return { role: null, hasSession: false };
  }
};

export function middleware(request: NextRequest) {
  try {
    const { pathname, search } = request.nextUrl;
    const isApiAdmin = pathname.startsWith("/api/admin");
    const { role, hasSession } = readSessionRole(request);

    if (isAdminPath(pathname) || isApiAdmin) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[middleware] admin guard role=${role ?? "none"} path=${pathname}`);
      }
      if (!hasSession) {
        if (isApiAdmin) {
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        const url = new URL("/login", request.url);
        if (!pathname.startsWith("/login")) {
          url.searchParams.set("next", `${pathname}${search}`);
        }
        return NextResponse.redirect(url);
      }
      if (role !== "admin") {
        if (isApiAdmin) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    if (isUserPath(pathname)) {
      if (!hasSession) {
        const url = new URL("/login", request.url);
        if (!pathname.startsWith("/login")) {
          url.searchParams.set("next", `${pathname}${search}`);
        }
        return NextResponse.redirect(url);
      }
      if (role !== "user" && role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("[middleware] proxy error", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/cabinet",
    "/cabinet/:path*",
    "/admin",
    "/admin/:path*",
    "/api/admin",
    "/api/admin/:path*",
  ],
};
