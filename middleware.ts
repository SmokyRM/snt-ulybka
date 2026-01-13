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

/**
 * Helper to apply QA cookie to any NextResponse (redirect or next)
 */
function applyQaCookie(response: NextResponse, qaParam: string | null): void {
  if (qaParam === "clear") {
    // Clear QA scenario cookie with same options as setting
    response.cookies.set(QA_COOKIE, "", {
      path: "/",
      maxAge: 0,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
    });
  } else if (qaParam) {
    // Set QA scenario cookie with standard options
    response.cookies.set(QA_COOKIE, qaParam, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export function middleware(request: NextRequest) {
  try {
    const { pathname, search } = request.nextUrl;
<<<<<<< HEAD
=======
    const isAdminPath = pathname.startsWith("/admin");
    const isCabinetPath = pathname.startsWith("/cabinet");
    const isOfficePath = pathname.startsWith("/office");
    const isApiAdmin = pathname.startsWith("/api/admin");
    const { hasSession } = readSessionRole(request);
    const { role } = readSessionRole(request);
>>>>>>> 737c5be (codex snapshot)
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

    // Handle QA override *before* any auth / RBAC redirects so that QA cookies
    // are set on the response that performs the redirect.
    if (isDev && qaParam && (allowedQa || qaParam === "clear")) {
      const isApi = pathname.startsWith("/api/");
      const response = isApi ? NextResponse.next() : (() => {
        const cleanUrl = request.nextUrl.clone();
        cleanUrl.searchParams.delete("qa");
        return NextResponse.redirect(cleanUrl);
      })();
      applyQaCookie(response, qaParam);
      return response;
    }
<<<<<<< HEAD

    const isAdminPath = pathname.startsWith("/admin");
    const isCabinetPath = pathname.startsWith("/cabinet");
    const isOfficePath = pathname.startsWith("/office");
    const isApiAdmin = pathname.startsWith("/api/admin");
    const { hasSession } = readSessionRole(request);
    const { role } = readSessionRole(request);
    const response = NextResponse.next();

    // Derive QA role from cookie (query param was already consumed above if redirect happened)
    // Also check qaParam if cookie isn't available yet (for cases where cookie is being set on redirect)
    const qaCookieAfterRedirect = isDev ? request.cookies.get(QA_COOKIE)?.value : null;
    const qaSourceForAuth = qaCookieAfterRedirect ?? (isDev && allowedQa ? qaParam : null);
    const qaRoleSource = qaSourceForAuth as string | null;
    const mappedQaRole: SessionRole | null =
      qaRoleSource === "guest"
        ? null
        : qaRoleSource === "resident_ok" || qaRoleSource === "resident_debtor" || qaRoleSource === "resident"
          ? "resident"
          : qaRoleSource === "chairman" || qaRoleSource === "accountant" || qaRoleSource === "secretary" || qaRoleSource === "admin"
            ? (qaRoleSource as SessionRole)
            : null;

    const effectiveRole: SessionRole | null = mappedQaRole ?? role;
    const hasAuth = hasSession || mappedQaRole !== null;

    if (isAdminPath || isCabinetPath || isOfficePath || isApiAdmin) {
      // Treat QA override as a form of auth in dev; only redirect when neither
      // real session nor QA role are present.
      if (!hasAuth) {
=======
    const qaCookie = isDev ? request.cookies.get(QA_COOKIE)?.value : null;
    const effectiveRole: SessionRole | null =
      qaCookie === "guest"
        ? null
        : qaCookie === "resident_ok" || qaCookie === "resident_debtor" || qaCookie === "resident"
          ? "resident"
          : qaCookie === "chairman" || qaCookie === "accountant" || qaCookie === "secretary" || qaCookie === "admin"
            ? (qaCookie as SessionRole)
            : role;

    if (isAdminPath || isCabinetPath || isOfficePath || isApiAdmin) {
      if (!hasSession) {
>>>>>>> 737c5be (codex snapshot)
        if (isApiAdmin) {
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        // Office paths should redirect to staff-login, not regular login
        if (isOfficePath) {
          const url = new URL("/staff-login", request.url);
          if (!pathname.startsWith("/staff-login")) {
            url.searchParams.set("next", `${pathname}${search}`);
          }
          const redirectResponse = NextResponse.redirect(url);
          // Apply QA cookie to redirect if qaParam was present in query
          if (qaParam && (allowedQa || qaParam === "clear")) {
            applyQaCookie(redirectResponse, qaParam);
          }
          return redirectResponse;
        }
        // Admin and cabinet paths redirect to regular login
        const url = new URL("/login", request.url);
        if (!pathname.startsWith("/login")) {
          url.searchParams.set("next", `${pathname}${search}`);
        }
<<<<<<< HEAD
        const redirectResponse = NextResponse.redirect(url);
        // Apply QA cookie to redirect if qaParam was present in query
        if (qaParam && (allowedQa || qaParam === "clear")) {
          applyQaCookie(redirectResponse, qaParam);
        }
        return redirectResponse;
      }
    }

    // Admin guard - use effectiveRole to support QA override
    if (isAdminPath || isApiAdmin) {
      const isAdminRole = effectiveRole === "admin";
      if (!isAdminRole) {
        if (isApiAdmin) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const url = new URL("/forbidden", request.url);
        const redirectResponse = NextResponse.redirect(url);
        // Apply QA cookie to redirect if qaParam was present in query
        if (qaParam && (allowedQa || qaParam === "clear")) {
          applyQaCookie(redirectResponse, qaParam);
        }
        return redirectResponse;
      }
    }

    // Office guard
    if (isOfficePath) {
      const checkRole = effectiveRole ?? role;
      const isStaff =
        checkRole === "chairman" || checkRole === "accountant" || checkRole === "secretary" || checkRole === "admin";
      if (!isStaff) {
        const url = new URL("/forbidden", request.url);
        const redirectResponse = NextResponse.redirect(url);
        // Apply QA cookie to redirect if qaParam was present in query
        if (qaParam && (allowedQa || qaParam === "clear")) {
          applyQaCookie(redirectResponse, qaParam);
        }
        return redirectResponse;
      }
    }

=======
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
      const isStaff = checkRole === "chairman" || checkRole === "accountant" || checkRole === "secretary";
      if (!isStaff) {
        const url = new URL("/forbidden", request.url);
        return NextResponse.redirect(url);
      }
    }

>>>>>>> 737c5be (codex snapshot)
    // Cabinet guard
    if (isCabinetPath) {
      const checkRole = effectiveRole ?? role;
      const isResident =
        checkRole === "resident" || checkRole === "resident_debtor" || checkRole === "user" || checkRole === "admin";
      if (!isResident) {
        const url = new URL("/forbidden", request.url);
<<<<<<< HEAD
        const redirectResponse = NextResponse.redirect(url);
        // Apply QA cookie to redirect if qaParam was present in query
        if (qaParam && (allowedQa || qaParam === "clear")) {
          applyQaCookie(redirectResponse, qaParam);
        }
        return redirectResponse;
=======
        return NextResponse.redirect(url);
>>>>>>> 737c5be (codex snapshot)
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
