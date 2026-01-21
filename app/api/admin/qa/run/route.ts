import { getSessionUser, getEffectiveSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getQaScenarioFromCookies } from "@/lib/qaScenario.server";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { normalizeRole } from "@/lib/rbac";
import { cookies } from "next/headers";
import { promises as fs } from "fs";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { forbidden, ok, serverError } from "@/lib/api/respond";

// Reuse types and functions from run-access-matrix
type Role = "guest" | "resident" | "chairman" | "secretary" | "accountant" | "admin";
type Route = "/cabinet" | "/office" | "/admin" | "/login" | "/staff-login" | "/forbidden" | "/";
type TestResult = "ALLOW" | "LOGIN_REQUIRED" | "FORBIDDEN" | "SERVER_ERROR";

const ROLES: Role[] = ["guest", "resident", "chairman", "secretary", "accountant", "admin"];
const ROUTES: Route[] = ["/cabinet", "/office", "/admin", "/login", "/staff-login", "/forbidden", "/"];

// Critical routes for dead-ends and smoke checks
const CRITICAL_ROUTES = [
  "/",
  "/cabinet",
  "/cabinet/profile?onboarding=1",
  "/office",
  "/office/announcements",
  "/admin",
  "/login",
  "/staff-login",
  "/forbidden",
];

// Expected page markers
type PageMarker = { testId?: string; text?: string };
const PAGE_MARKERS: Record<string, PageMarker> = {
  "/login": { testId: "login-form" },
  "/staff-login": { testId: "staff-login-form" },
  "/forbidden": { text: "Нет доступа" },
  "/admin/qa": { text: "Матрица доступов" },
  "/office": { text: "Офис" }, // Office page should contain "Офис" text
  "/cabinet": { text: "Кабинет" }, // Cabinet page should contain "Кабинет" text
  "/admin": { text: "Администрирование" }, // Admin page should contain admin text
};

// Import matrix check functions from run-access-matrix
const ROLE_USER_IDS: Record<string, string> = {
  admin: "user-admin-root",
  resident: "user-resident-default",
  chairman: "user-chairman-default",
  accountant: "user-accountant-default",
  secretary: "user-secretary-default",
};

async function getCookieForRole(role: Role, baseUrl: string): Promise<string | null> {
  if (role === "guest") return null;

  try {
    // For staff roles (admin/chairman/secretary/accountant)
    if (role === "admin" || role === "chairman" || role === "secretary" || role === "accountant") {
      const roleRuMap: Record<string, string> = {
        admin: "админ",
        chairman: "председатель",
        secretary: "секретарь",
        accountant: "бухгалтер",
      };
      
      const roleRu = roleRuMap[role];
      const envPassMap: Record<string, string> = {
        admin: "AUTH_PASS_ADMIN",
        chairman: "AUTH_PASS_CHAIRMAN",
        secretary: "AUTH_PASS_SECRETARY",
        accountant: "AUTH_PASS_ACCOUNTANT",
      };
      
      const password = (process.env[envPassMap[role]] ?? "").trim();
      const userId = ROLE_USER_IDS[role];
      if (!userId) return null;
      
      const { upsertUserById } = await import("@/lib/mockDb");
      upsertUserById({ id: userId, role });
      
      if (!password) {
        const payload = JSON.stringify({ role, userId });
        return `snt_session=${encodeURIComponent(payload)}`;
      }

      const loginUrl = new URL("/api/auth/login", baseUrl);
      const loginResponse = await fetch(loginUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "staff",
          roleRu,
          password,
        }),
      });

      if (!loginResponse.ok) {
        const payload = JSON.stringify({ role, userId });
        return `snt_session=${encodeURIComponent(payload)}`;
      }

      const setCookieHeader = loginResponse.headers.get("set-cookie");
      if (setCookieHeader) {
        const setCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        for (const cookieStr of setCookies) {
          const match = cookieStr.match(/snt_session=([^;]+)/);
          if (match && match[1]) {
            return `snt_session=${match[1]}`;
          }
        }
      }

      const payload = JSON.stringify({ role, userId });
      return `snt_session=${encodeURIComponent(payload)}`;
    }

    // For resident
    if (role === "resident") {
      const userId = ROLE_USER_IDS[role];
      if (!userId) return null;
      
      const { upsertUserById } = await import("@/lib/mockDb");
      upsertUserById({ id: userId, role });

      const loginUrl = new URL("/api/auth/resident-login", baseUrl);
      const loginResponse = await fetch(loginUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: "resident",
        }),
      });

      if (!loginResponse.ok) {
        const payload = JSON.stringify({ role, userId });
        return `snt_session=${encodeURIComponent(payload)}`;
      }

      const setCookieHeader = loginResponse.headers.get("set-cookie");
      if (setCookieHeader) {
        const setCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        for (const cookieStr of setCookies) {
          const match = cookieStr.match(/snt_session=([^;]+)/);
          if (match && match[1]) {
            return `snt_session=${match[1]}`;
          }
        }
      }

      const payload = JSON.stringify({ role, userId });
      return `snt_session=${encodeURIComponent(payload)}`;
    }

    return null;
  } catch (error) {
    const userId = ROLE_USER_IDS[role];
    if (!userId) return null;
    const payload = JSON.stringify({ role, userId });
    return `snt_session=${encodeURIComponent(payload)}`;
  }
}

async function followRedirects(
  initialUrl: string,
  cookie: string | null | undefined,
  baseUrl: string,
  maxRedirects = 5
): Promise<{
  finalStatus: number;
  finalUrl: string;
  redirectChain: Array<{ from: string; to: string; status: number }>;
  traceHeaders: Record<string, string>;
}> {
  const redirectChain: Array<{ from: string; to: string; status: number }> = [];
  let currentUrl = initialUrl;
  let finalStatus = 0;
  let finalUrl = initialUrl;
  const traceHeaders: Record<string, string> = {};

  const headers: HeadersInit = { "Cache-Control": "no-store" };
  if (cookie) headers["Cookie"] = cookie;

  for (let i = 0; i < maxRedirects; i++) {
    try {
      const response = await fetch(currentUrl, { method: "HEAD", redirect: "manual", headers }).catch(() =>
        fetch(currentUrl, { method: "GET", redirect: "manual", headers })
      );
      
      finalStatus = response.status;
      const location = response.headers.get("location");
      
      // Extract trace headers
      ["x-auth-source", "x-auth-reason", "x-auth-guard", "x-request-id"].forEach((key) => {
        const value = response.headers.get(key);
        if (value) traceHeaders[key] = value;
      });

      if (response.status >= 300 && response.status < 400 && location) {
        const nextUrl = location.startsWith("http") ? location : new URL(location, baseUrl).toString();
        redirectChain.push({ from: currentUrl, to: nextUrl, status: response.status });
        currentUrl = nextUrl;
        finalUrl = nextUrl;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  try {
    const finalUrlObj = new URL(finalUrl, baseUrl);
    finalUrl = finalUrlObj.pathname + finalUrlObj.search;
  } catch {
    finalUrl = finalUrl.replace(baseUrl, "") || "/";
  }

  return { finalStatus, finalUrl, redirectChain, traceHeaders };
}

function classifyResult(
  status: number,
  finalUrl: string,
  route: Route,
  redirectTo?: string,
  redirectChain?: Array<{ from: string; to: string; status: number }>
): { result: TestResult; reason?: string } {
  // SERVER_ERROR: 5xx
  if (status >= 500) {
    return { result: "SERVER_ERROR" };
  }

  // Парсим finalUrl для извлечения reason
  let reason: string | undefined;
  try {
    const url = new URL(finalUrl, "http://localhost");
    if (url.pathname === "/forbidden") {
      reason = url.searchParams.get("reason") || undefined;
    }
  } catch {
    // Ignore
  }

  // КРИТИЧНО: Если это целевой маршрут /login или /staff-login и status=200 без редиректов -> ALLOW
  if ((route === "/login" || route === "/staff-login") && status === 200) {
    const hasRedirects = redirectChain && redirectChain.length > 0;
    if (!hasRedirects) {
      try {
        const finalUrlObj = new URL(finalUrl, "http://localhost");
        if (finalUrlObj.pathname === route || finalUrlObj.pathname === "/staff/login") {
          return { result: "ALLOW" };
        }
      } catch {
        if (finalUrl === route || finalUrl === "/staff/login") {
          return { result: "ALLOW" };
        }
      }
    }
  }

  // КРИТИЧНО: Если это целевой маршрут /forbidden и status=200 -> ALLOW (это страница, не запрет)
  if (route === "/forbidden" && status === 200) {
    try {
      const finalUrlObj = new URL(finalUrl, "http://localhost");
      if (finalUrlObj.pathname === "/forbidden") {
        return { result: "ALLOW" };
      }
    } catch {
      if (finalUrl.includes("/forbidden")) {
        return { result: "ALLOW" };
      }
    }
  }

  // FORBIDDEN: редирект на /forbidden?reason=... (не целевой маршрут)
  const hasForbiddenRedirect = redirectChain?.some(
    (step) => step.to.includes("/forbidden?reason=") || step.to.includes("/forbidden&reason=")
  ) || (redirectTo && (redirectTo.includes("/forbidden?reason=") || redirectTo.includes("/forbidden&reason=")));

  if (hasForbiddenRedirect) {
    return { result: "FORBIDDEN", reason };
  }

  // Проверяем finalUrl на /forbidden?reason=... (редирект завершился на forbidden с reason)
  try {
    const finalUrlObj = new URL(finalUrl, "http://localhost");
    if (finalUrlObj.pathname === "/forbidden" && finalUrlObj.searchParams.has("reason")) {
      return { result: "FORBIDDEN", reason };
    }
  } catch {
    if (finalUrl.includes("/forbidden?reason=") || finalUrl.includes("/forbidden&reason=")) {
      return { result: "FORBIDDEN", reason };
    }
  }

  // LOGIN_REQUIRED: редирект на /login или /staff-login (не целевой маршрут)
  const loginPaths = ["/login", "/staff-login", "/staff/login"];
  const hasLoginRedirect = redirectChain?.some(
    (step) => loginPaths.some((path) => step.to.includes(path))
  ) || (redirectTo && loginPaths.some((path) => redirectTo.includes(path)));

  if (hasLoginRedirect) {
    if (route !== "/login" && route !== "/staff-login") {
      return { result: "LOGIN_REQUIRED" };
    }
  }

  // Проверяем finalUrl на login paths (только если это не целевой маршрут)
  if (route !== "/login" && route !== "/staff-login") {
    try {
      const finalUrlObj = new URL(finalUrl, "http://localhost");
      if (loginPaths.some((path) => finalUrlObj.pathname === path || finalUrlObj.pathname.startsWith(path))) {
        return { result: "LOGIN_REQUIRED" };
      }
    } catch {
      if (loginPaths.some((path) => finalUrl.includes(path))) {
        return { result: "LOGIN_REQUIRED" };
      }
    }
  }

  // ALLOW: конечная страница 200
  // Sprint 7.6: Для office ролей проверяем что finalUrl начинается с /office (не /forbidden)
  if (status >= 200 && status < 300) {
    // Для /office маршрутов проверяем что finalUrl начинается с /office (регрессионная проверка)
    if (route === "/office" || route.startsWith("/office/")) {
      try {
        const finalUrlObj = new URL(finalUrl, "http://localhost");
        if (!finalUrlObj.pathname.startsWith("/office")) {
          // Если finalUrl не начинается с /office (например, /forbidden) -> FORBIDDEN
          return { result: "FORBIDDEN", reason };
        }
      } catch {
        // Если не удалось распарсить, проверяем строку
        if (!finalUrl.startsWith("/office") && finalUrl.includes("/forbidden")) {
          return { result: "FORBIDDEN", reason };
        }
      }
    }
    return { result: "ALLOW" };
  }

  // Fallback: считаем как FORBIDDEN
  return { result: "FORBIDDEN", reason };
}

async function checkRoute(
  role: Role,
  route: Route,
  baseUrl: string,
  cookie: string | null
): Promise<{
  result: TestResult;
  httpStatus: number;
  finalUrl: string;
  redirectTo?: string;
  reason?: string;
  redirectChain: Array<{ from: string; to: string; status: number }>;
  timingMs: number;
}> {
  const startTime = Date.now();
  const url = new URL(route, baseUrl);

  try {
    const { finalStatus, finalUrl, redirectChain } = await followRedirects(url.toString(), cookie, baseUrl);
    const timingMs = Date.now() - startTime;

    const redirectTo = redirectChain.length > 0 ? redirectChain[redirectChain.length - 1].to : undefined;
    const { result, reason } = classifyResult(finalStatus, finalUrl, route, redirectTo, redirectChain);

    return { result, httpStatus: finalStatus, finalUrl, redirectTo, reason, redirectChain, timingMs };
  } catch {
    return {
      result: "SERVER_ERROR",
      httpStatus: 0,
      finalUrl: route,
      redirectChain: [],
      timingMs: Date.now() - startTime,
    };
  }
}

const EXPECTED: Record<Role, Record<Route, TestResult>> = {
  guest: {
    "/cabinet": "LOGIN_REQUIRED",
    "/office": "LOGIN_REQUIRED",
    "/admin": "LOGIN_REQUIRED",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
  resident: {
    "/cabinet": "ALLOW",
    "/office": "FORBIDDEN",
    "/admin": "FORBIDDEN",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
  chairman: {
    "/cabinet": "ALLOW",
    "/office": "ALLOW",
    "/admin": "FORBIDDEN",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
  secretary: {
    "/cabinet": "ALLOW",
    "/office": "ALLOW",
    "/admin": "FORBIDDEN",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
  accountant: {
    "/cabinet": "ALLOW",
    "/office": "ALLOW",
    "/admin": "FORBIDDEN",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
  admin: {
    "/cabinet": "ALLOW",
    "/office": "ALLOW",
    "/admin": "ALLOW",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
};

async function ensureReportsDir(): Promise<string> {
  const reportsDir = join(process.cwd(), "tmp", "qa-reports");
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }
  return reportsDir;
}

async function saveReport(reportId: string, report: unknown): Promise<void> {
  const reportsDir = await ensureReportsDir();
  const filePath = join(reportsDir, `${reportId}.json`);
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf-8");
}

export async function POST(request: Request) {
  try {
    // RBAC: admin only
    const user = await getSessionUser();
    if (!user || !hasAdminAccess(user)) {
      return forbidden(request, "forbidden");
    }

    // CSRF protection
    const originCheck = verifySameOrigin(request);
    if (!originCheck.ok) {
      return forbidden(request, "origin check failed");
    }

    const baseUrl = new URL(request.url).origin;
    const reportId = `qa-report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const generatedAt = new Date().toISOString();

    // Get session context
    const cookieStore = await cookies();
    const sessionUser = await getSessionUser();
    const effectiveUser = await getEffectiveSessionUser();
    const qaScenario = await getQaScenarioFromCookies(cookieStore);
    
    const sessionContext = {
      role: sessionUser?.role || null,
      effectiveRole: effectiveUser?.role || null,
      normalizedRole: sessionUser?.role ? normalizeRole(sessionUser.role) : null,
      qaScenario: qaScenario || null,
    };

    // A) Health check
    const healthStartTime = Date.now();
    let healthCheck: { ok: boolean; status: number; timingMs: number; error?: string };
    try {
      const healthResponse = await fetch(`${baseUrl}/api/healthz`, { cache: "no-store" });
      const healthData = await healthResponse.json().catch(() => ({}));
      healthCheck = {
        ok: healthResponse.ok && (healthData.ok === true),
        status: healthResponse.status,
        timingMs: Date.now() - healthStartTime,
      };
    } catch (error) {
      healthCheck = {
        ok: false,
        status: 0,
        timingMs: Date.now() - healthStartTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // B) Access Matrix check
    type MatrixCell = {
      expected: TestResult;
      actual: TestResult;
      status: number;
      finalUrl: string;
      forbiddenReason?: string;
      redirectChain: Array<{ from: string; to: string; status: number }>;
      timingMs: number;
      notes?: string;
    };
    const matrixStartTime = Date.now();
    const matrixResults: Record<Role, Record<Route, MatrixCell>> = {} as Record<Role, Record<Route, MatrixCell>>;

    const roleCookies: Record<Role, string | null> = {} as Record<Role, string | null>;
    for (const role of ROLES) {
      roleCookies[role] = await getCookieForRole(role, baseUrl);
      matrixResults[role] = {} as Record<Route, MatrixCell>;
      for (const route of ROUTES) {
        const checkResult = await checkRoute(role, route, baseUrl, roleCookies[role] ?? null);
        const expected = EXPECTED[role][route];
        const actual = checkResult.result;
        
        matrixResults[role][route] = {
          expected,
          actual,
          status: checkResult.httpStatus,
          finalUrl: checkResult.finalUrl,
          forbiddenReason: checkResult.reason,
          redirectChain: checkResult.redirectChain,
          timingMs: checkResult.timingMs,
        };
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    // Calculate matrix summary
    let okCount = 0;
    let mismatchCount = 0;
    let forbiddenOkCount = 0;
    let loginOkCount = 0;
    let errorCount = 0;

    for (const role of ROLES) {
      for (const route of ROUTES) {
        const cell = matrixResults[role][route];
        if (cell.actual === "SERVER_ERROR") {
          errorCount++;
        } else if (cell.expected === cell.actual) {
          okCount++;
          if (cell.actual === "FORBIDDEN") forbiddenOkCount++;
          if (cell.actual === "LOGIN_REQUIRED") loginOkCount++;
        } else {
          mismatchCount++;
        }
      }
    }

    const matrixSummary = {
      ok: okCount,
      mismatches: mismatchCount,
      forbiddenOk: forbiddenOkCount,
      loginOk: loginOkCount,
      errors: errorCount,
      pass: mismatchCount === 0 && errorCount === 0,
    };

    // C) Dead-ends scan
    const deadEndsIssues: Array<{
      route: string;
      issue: "404" | "redirect_loop" | "unexpected_forbidden" | "unexpected_redirect";
      details: string;
      finalUrl?: string;
      redirectCount?: number;
    }> = [];

    for (const route of CRITICAL_ROUTES) {
      try {
        const url = new URL(route, baseUrl);
        const visitedUrls = new Set<string>();
        let currentUrl = url.toString();
        let redirectCount = 0;
        const MAX_REDIRECTS = 5;

        while (redirectCount < MAX_REDIRECTS) {
          if (visitedUrls.has(currentUrl)) {
            deadEndsIssues.push({
              route,
              issue: "redirect_loop",
              details: `Redirect loop after ${redirectCount} redirects`,
              redirectCount,
            });
            break;
          }
          visitedUrls.add(currentUrl);

          const response = await fetch(currentUrl, {
            method: "HEAD",
            redirect: "manual",
            cache: "no-store",
          }).catch(() =>
            fetch(currentUrl, {
              method: "GET",
              redirect: "manual",
              cache: "no-store",
            })
          );

          if (response.status === 404) {
            deadEndsIssues.push({
              route,
              issue: "404",
              details: "Route returns 404",
              finalUrl: currentUrl,
            });
            break;
          }

          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (location) {
              const nextUrl = location.startsWith("http") ? location : new URL(location, baseUrl).toString();
              if (visitedUrls.has(nextUrl)) {
                deadEndsIssues.push({
                  route,
                  issue: "redirect_loop",
                  details: `Redirect loop detected: ${currentUrl} -> ${nextUrl}`,
                  redirectCount: redirectCount + 1,
                });
                break;
              }
              currentUrl = nextUrl;
              redirectCount++;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        deadEndsIssues.push({
          route,
          issue: "unexpected_redirect",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // D) Key pages smoke
    const smokeIssues: Array<{
      route: string;
      issue: "missing_marker" | "server_error";
      details: string;
      status: number;
      finalUrl: string;
    }> = [];

    for (const route of CRITICAL_ROUTES) {
      try {
        const url = new URL(route, baseUrl);
        const response = await fetch(url.toString(), { cache: "no-store", redirect: "follow" });
        const html = await response.text();
        const finalUrl = response.url.replace(baseUrl, "") || route;
        const finalUrlPath = new URL(response.url).pathname;

        // Skip marker check if page redirected to login (protected pages require auth)
        const isLoginRedirect = finalUrlPath === "/login" || finalUrlPath === "/staff/login" || finalUrlPath === "/staff-login";
        const isProtectedRoute = route === "/cabinet" || route === "/office" || route === "/admin";
        
        if (isProtectedRoute && isLoginRedirect) {
          // Protected route redirected to login - skip marker check (expected behavior)
          continue;
        }

        const marker = PAGE_MARKERS[route];
        if (marker) {
          const hasTestId = marker.testId ? html.includes(`data-testid="${marker.testId}"`) : true;
          const hasText = marker.text ? html.includes(marker.text) : true;

          if (!hasTestId || !hasText) {
            smokeIssues.push({
              route,
              issue: "missing_marker",
              details: `Expected ${marker.testId ? `data-testid="${marker.testId}"` : ""} ${marker.text ? `or text "${marker.text}"` : ""}`,
              status: response.status,
              finalUrl,
            });
          }
        }

        if (response.status >= 500) {
          smokeIssues.push({
            route,
            issue: "server_error",
            details: `Server error: ${response.status}`,
            status: response.status,
            finalUrl,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        smokeIssues.push({
          route,
          issue: "server_error",
          details: error instanceof Error ? error.message : String(error),
          status: 0,
          finalUrl: route,
        });
      }
    }

    // Build report
    const report = {
      reportId,
      generatedAt,
      app: {
        env: process.env.NODE_ENV || "unknown",
        version: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
        commit: process.env.GIT_SHA || undefined,
      },
      sessionContext,
      checks: {
        health: healthCheck,
        accessMatrix: {
          results: matrixResults,
          summary: matrixSummary,
          timingMs: Date.now() - matrixStartTime,
        },
        deadEnds: {
          issues: deadEndsIssues,
          pass: deadEndsIssues.length === 0,
        },
        smoke: {
          issues: smokeIssues,
          pass: smokeIssues.length === 0,
        },
      },
    };

    // Calculate overall summary
    const overallPass =
      healthCheck.ok && matrixSummary.pass && deadEndsIssues.length === 0 && smokeIssues.length === 0;

    const summary = {
      pass: overallPass,
      totals: {
        healthOk: healthCheck.ok ? 1 : 0,
        matrixMismatches: mismatchCount,
        deadEndsIssues: deadEndsIssues.length,
        smokeIssues: smokeIssues.length,
      },
    };

    // Save report
    await saveReport(reportId, report).catch((error) => {
      console.error("[qa/run] Failed to save report:", error);
    });

    return ok(request, { reportId, report, summary });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
