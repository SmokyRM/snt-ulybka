import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminPath, isUserPath } from "@/config/routesAccess";

const SESSION_COOKIE = "snt_session";

type SessionRole = "user" | "admin" | "board";

const readSessionRole = (request: NextRequest): SessionRole | null => {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { role?: SessionRole };
    return parsed.role ?? null;
  } catch {
    return null;
  }
};

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApiAdmin = pathname.startsWith("/api/admin");
  const role = readSessionRole(request);

  if (isAdminPath(pathname) || isApiAdmin) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[middleware] admin guard role=${role ?? "none"} path=${pathname}`);
    }
    if (!role) {
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
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/cabinet", request.url));
    }
  }

  if (isUserPath(pathname)) {
    if (!role) {
      const url = new URL("/login", request.url);
      if (!pathname.startsWith("/login")) {
        url.searchParams.set("next", `${pathname}${search}`);
      }
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
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
