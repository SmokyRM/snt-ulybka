import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "snt_session";
const QA_COOKIE = "qaScenario";

type SessionRole =
  | "user"
  | "admin"
  | "board"
  | "accountant"
  | "operator"
  | "resident"
  | "resident_debtor"
  | "chairman"
  | "secretary";

const readSessionRole = (
  request: NextRequest
): { role: SessionRole | null; hasSession: boolean } => {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return { role: null, hasSession: false };
  try {
    const parsed = JSON.parse(raw) as { role?: string; userId?: string };
    if (!parsed || !parsed.userId) return { role: null, hasSession: false };
    const normalizedRole =
      parsed.role === "resident_debtor" ? "resident" : (parsed.role as SessionRole | undefined);
    const role: SessionRole =
      normalizedRole === "admin" ||
      normalizedRole === "board" ||
      normalizedRole === "accountant" ||
      normalizedRole === "operator" ||
      normalizedRole === "resident" ||
      normalizedRole === "chairman" ||
      normalizedRole === "secretary" ||
      normalizedRole === "user"
        ? normalizedRole
        : "user";
    return { role, hasSession: true };
  } catch {
    return { role: null, hasSession: false };
  }
};

export function middleware(request: NextRequest) {
  try {
    const { pathname, search } = request.nextUrl;
    const isAdminPath = pathname.startsWith("/admin");
    const isCabinetPath = pathname.startsWith("/cabinet");
    const isOfficePath = pathname.startsWith("/office");
    const isApiAdmin = pathname.startsWith("/api/admin");
    const { hasSession } = readSessionRole(request);
    const { role } = readSessionRole(request);
    const isDev = process.env.NODE_ENV !== "production";
    const qaParam = isDev ? request.nextUrl.searchParams.get("qa") : null;
    const allowedQa =
      qaParam === "guest" ||
      qaParam === "resident_ok" ||
      qaParam === "resident_debtor" ||
      qaParam === "admin" ||
      qaParam === "chairman" ||
      qaParam === "accountant" ||
      qaParam === "secretary" ||
      qaParam === "resident";

    const response = NextResponse.next();
    if (isDev && (allowedQa || qaParam === "clear")) {
      if (qaParam === "clear") {
        response.cookies.set(QA_COOKIE, "", { path: "/", maxAge: 0 });
      } else if (qaParam) {
        response.cookies.set(QA_COOKIE, qaParam, {
          path: "/",
          httpOnly: false,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
        });
      }
    }
    const qaCookie = isDev ? request.cookies.get(QA_COOKIE)?.value : null;
    const qaRole =
      qaParam && allowedQa
        ? qaParam
        : qaCookie;
    const effectiveRole: SessionRole | null =
      qaRole === "guest"
        ? null
        : qaRole === "resident_ok" || qaRole === "resident_debtor" || qaRole === "resident"
          ? "resident"
          : qaRole === "chairman" || qaRole === "accountant" || qaRole === "secretary" || qaRole === "admin"
            ? (qaRole as SessionRole)
            : role;

    if (isAdminPath || isCabinetPath || isOfficePath || isApiAdmin) {
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
    }

    // Admin guard
    if (isAdminPath || isApiAdmin) {
      const isAdminRole = role === "admin";
      if (!isAdminRole) {
        if (isApiAdmin) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const url = new URL("/forbidden", request.url);
        return NextResponse.redirect(url);
      }
    }

    // Office guard
    if (isOfficePath) {
      const checkRole = effectiveRole ?? role;
      const isStaff =
        checkRole === "chairman" || checkRole === "accountant" || checkRole === "secretary" || checkRole === "admin";
      if (!isStaff) {
        const url = new URL("/forbidden", request.url);
        return NextResponse.redirect(url);
      }
    }

    // Cabinet guard
    if (isCabinetPath) {
      const checkRole = effectiveRole ?? role;
      const isResident =
        checkRole === "resident" || checkRole === "resident_debtor" || checkRole === "user" || checkRole === "admin";
      if (!isResident) {
        const url = new URL("/forbidden", request.url);
        return NextResponse.redirect(url);
      }
    }

    return response;
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
    "/office",
    "/office/:path*",
    "/api/admin",
    "/api/admin/:path*",
  ],
};
