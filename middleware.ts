import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminPath, isUserPath } from "@/config/routesAccess";

const SESSION_COOKIE = "snt_session";

type SessionRole = "user" | "admin" | "board" | "accountant" | "operator";

const readSessionRole = (
  request: NextRequest
): { role: SessionRole | null; hasSession: boolean } => {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return { role: null, hasSession: false };
  try {
    const parsed = JSON.parse(raw) as { role?: SessionRole };
    const role: SessionRole =
      parsed.role === "admin" ||
      parsed.role === "board" ||
      parsed.role === "accountant" ||
      parsed.role === "operator" ||
      parsed.role === "user"
        ? parsed.role
        : "user";
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
      if (role !== "admin" && role !== "accountant" && role !== "operator" && role !== "board") {
        if (isApiAdmin) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const url = new URL("/login", request.url);
        url.searchParams.set("next", "/admin");
        return NextResponse.redirect(url);
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
      if (role !== "user" && role !== "admin" && role !== "board") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("proxy error", error);
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
