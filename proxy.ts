import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isOfficeRole, isAdminRole, normalizeRole } from "@/lib/rbac";
import { sanitizeNextUrl } from "@/lib/sanitizeNextUrl";
import { computeEffectiveRole, type SessionRole } from "@/lib/middleware-effective-role";
import { logAuthEvent } from "@/lib/structuredLogger/edge";

const SESSION_COOKIE = "snt_session";
const QA_COOKIE = "qaScenario";
const REQUEST_ID_HEADER = "x-request-id";
const USER_LOGIN_PATH = "/login";
const STAFF_LOGIN_PATH = "/staff/login";
const STAFF_LOGIN_ALT_PATH = "/staff-login"; // Альтернативный путь - будет редиректить на /staff/login

const isAuthRoute = (path: string): boolean =>
  path.startsWith(USER_LOGIN_PATH) ||
  path.startsWith(STAFF_LOGIN_PATH) ||
  path === "/forbidden" ||
  path === "/not-found";

/**
 * Edge-safe генератор request-id
 * Использует Web Crypto API, доступный в Edge runtime
 */
export function edgeRequestId(): string {
  // Пытаемся использовать randomUUID если доступен (современные Edge runtimes)
  if (typeof globalThis !== "undefined" && globalThis.crypto && "randomUUID" in globalThis.crypto) {
    try {
      return globalThis.crypto.randomUUID();
    } catch {
      // Fallback если randomUUID не работает
    }
  }

  // Fallback: используем getRandomValues + hex преобразование
  if (typeof globalThis !== "undefined" && globalThis.crypto && "getRandomValues" in globalThis.crypto) {
    const array = new Uint8Array(16);
    globalThis.crypto.getRandomValues(array);
    // Устанавливаем версию UUID v4 (бит 12 = 4)
    array[6] = (array[6] & 0x0f) | 0x40;
    // Устанавливаем вариант UUID (биты 6-7 = 10)
    array[8] = (array[8] & 0x3f) | 0x80;
    // Преобразуем в hex строку формата UUID v4
    const hex = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // Форматируем как UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  // Последний fallback: timestamp + случайные числа (не идеально, но работает)
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}-${Math.random().toString(36).substring(2, 11)}`;
}

// SessionRole экспортирован из @/lib/middleware-effective-role

const readSessionRole = (request: NextRequest): { role: SessionRole | null; hasSession: boolean } => {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return { role: null, hasSession: false };
  try {
    const parsed = JSON.parse(raw) as { role?: string; userId?: string };
    if (!parsed || !parsed.userId) return { role: null, hasSession: false };
    
    // КРИТИЧНО: Проверяем что роль есть в payload
    if (!parsed.role || typeof parsed.role !== "string") {
      // Роль отсутствует в cookie - это ошибка, но не падаем, возвращаем null
      return { role: null, hasSession: true };
    }
    
    // КРИТИЧНО: Используем normalizeRole для нормализации роли из cookie
    // normalizeRole возвращает правильные office роли (chairman/secretary/accountant) и не превращает их в resident
    const normalized = normalizeRole(parsed.role);
    
    // Маппим результат normalizeRole в SessionRole (может быть "guest" -> null)
    if (normalized === "guest") {
      // Неизвестная роль -> null (не авторизован)
      return { role: null, hasSession: true };
    }
    
    // Маппим нормализованную роль в SessionRole
    // ВАЖНО: normalizeRole уже вернул правильную роль, просто маппим в SessionRole тип
    const role: SessionRole | null =
      normalized === "admin" ? "admin" :
      normalized === "resident" ? "resident" :
      normalized === "chairman" ? "chairman" :
      normalized === "secretary" ? "secretary" :
      normalized === "accountant" ? "accountant" :
      null; // Это не должно случиться если normalizeRole работает правильно
    
    return { role, hasSession: true };
  } catch (error) {
    // Логируем ошибку в dev режиме для отладки
    if (process.env.NODE_ENV !== "production") {
      console.error("[middleware] Ошибка чтения сессии:", error);
    }
    return { role: null, hasSession: false };
  }
};

export function proxy(request: NextRequest) {
  try {
    const { pathname, search } = request.nextUrl;
    const isAdminPath = pathname.startsWith("/admin");
    const isCabinetPath = pathname.startsWith("/cabinet");
    const isOfficePath = pathname.startsWith("/office");
    const isApiAdmin = pathname.startsWith("/api/admin");
    const { role, hasSession } = readSessionRole(request);
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

    // Генерируем или используем существующий request-id
    const existingRequestId = request.headers.get(REQUEST_ID_HEADER);
    const requestId = existingRequestId || edgeRequestId();

    // Единый pass-through response: для /admin прокидываем x-pathname в request (admin layout при !user подставит next=pathname)
    const reqHeaders = new Headers(request.headers);
    if (isAdminPath) reqHeaders.set("x-pathname", pathname);
    const response = NextResponse.next({ request: { headers: reqHeaders } });
    // Прокидываем request-id в заголовки ответа
    response.headers.set(REQUEST_ID_HEADER, requestId);
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
    const qaCookie = isDev ? request.cookies.get(QA_COOKIE)?.value ?? null : null;
    
    // КРИТИЧНО: Используем computeEffectiveRole для вычисления роли с учётом приоритета staff ролей
    // Эта функция гарантирует, что staff роли из cookie НЕ перезаписываются QA override для resident
    const effectiveRole = computeEffectiveRole(role, qaCookie, isDev);
    const hasAuth = hasSession || qaCookie !== null;
    const sanitizedCurrent = sanitizeNextUrl(`${pathname}${search}`);
    const attachNextParam = (url: URL) => {
      if (!isAuthRoute(pathname) && sanitizedCurrent) {
        url.searchParams.set("next", sanitizedCurrent);
      }
    };
    const redirectToStaffLogin = () => {
      const url = new URL(STAFF_LOGIN_PATH, request.url);
      attachNextParam(url);
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.headers.set(REQUEST_ID_HEADER, requestId);
      // Диагностические заголовки для матрицы доступов
      redirectResponse.headers.set("x-auth-source", "middleware");
      redirectResponse.headers.set("x-auth-reason", "login.required");
      redirectResponse.headers.set("x-auth-guard", "staff.login.required");
      return redirectResponse;
    };
    const redirectToUserLogin = () => {
      const url = new URL(USER_LOGIN_PATH, request.url);
      attachNextParam(url);
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.headers.set(REQUEST_ID_HEADER, requestId);
      // Диагностические заголовки для матрицы доступов
      redirectResponse.headers.set("x-auth-source", "middleware");
      redirectResponse.headers.set("x-auth-reason", "login.required");
      redirectResponse.headers.set("x-auth-guard", "user.login.required");
      return redirectResponse;
    };

    // Редирект /staff-login на /staff/login (унификация путей)
    if (pathname === STAFF_LOGIN_ALT_PATH || pathname.startsWith(`${STAFF_LOGIN_ALT_PATH}/`)) {
      const redirectUrl = pathname === STAFF_LOGIN_ALT_PATH 
        ? STAFF_LOGIN_PATH 
        : pathname.replace(STAFF_LOGIN_ALT_PATH, STAFF_LOGIN_PATH);
      if (isDev) {
        console.log("[guard-redirect]", { path: pathname, role: "n/a", reason: "staff-login.unify", redirectTo: redirectUrl });
      }
      const url = new URL(redirectUrl, request.url);
      url.search = search; // Сохраняем query параметры
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.headers.set(REQUEST_ID_HEADER, requestId);
      return redirectResponse;
    }

    // Пропускаем auth routes
    if (isAuthRoute(pathname)) {
      return response;
    }

    // КРИТИЧНО: Используем effectiveRole, который уже учёл приоритет staff ролей из cookie
    // effectiveRole вычисляется выше с учётом того, что staff роли из cookie НЕ перезаписываются
    // Нормализуем effectiveRole для финальной проверки
    // ВАЖНО: effectiveRole уже является SessionRole (может быть "chairman", "secretary", "accountant", "admin", "resident", null)
    // normalizeRole должен корректно обработать эти значения
    const normalizedRole = effectiveRole ? normalizeRole(effectiveRole) : normalizeRole(null);
    
    // DEBUG: server-side log в dev режиме для диагностики
    if (isDev && (isAdminPath || isOfficePath || isCabinetPath)) {
      const rawCookie = request.cookies.get(SESSION_COOKIE)?.value;
      let rawRole: string | null = null;
      try {
        const parsed = rawCookie ? JSON.parse(rawCookie) : null;
        rawRole = parsed?.role ?? null;
      } catch {
        rawRole = null;
      }
      const effectiveRoleSource = role ? "cookie" : qaCookie ? "qa" : "none";
      const isQaOverride = Boolean(qaCookie && effectiveRole && role && effectiveRole !== role);
      // qaIgnored: true если qaCookie есть, но мы его игнорируем из-за staff роли
      const qaIgnored = Boolean(
        qaCookie &&
        role &&
        effectiveRole === role &&
        (isAdminRole(role) || isOfficeRole(role))
      );
      // Sprint 5.4: Добавляем isOfficeRoleResult и isAdminRoleResult для normalizedRole
      const isOfficeRoleResult = isOfficeRole(normalizedRole);
      const isAdminRoleResult = isAdminRole(normalizedRole);
      console.log("[middleware-auth]", {
        path: pathname,
        rawRole: rawRole ?? "null",
        role: role ?? "null",
        realRole: role ?? "null",
        effectiveRole: effectiveRole ?? "null",
        effectiveRoleSource,
        isQaOverride,
        qaIgnored,
        qaCookie: qaCookie ?? "null",
        normalizedRole,
        isOfficeRoleResult,
        isAdminRoleResult,
        hasSession,
        authSource: effectiveRoleSource,
        cookieExists: request.cookies.get(SESSION_COOKIE) !== undefined,
      });
    }

    // /admin/** и /api/admin/** — admin: все; office (chairman/secretary/accountant): billing + registry, не системные настройки; resident/guest: запрет
    if (isAdminPath || isApiAdmin) {
      if (!hasAuth) {
        if (isDev) {
          console.log("[guard-redirect]", { path: pathname, role: String(normalizedRole ?? "null"), reason: "login.required", redirectTo: STAFF_LOGIN_PATH });
        }
        if (isApiAdmin) {
          const apiResponse = NextResponse.json({ error: "unauthorized" }, { status: 401 });
          apiResponse.headers.set(REQUEST_ID_HEADER, requestId);
          return apiResponse;
        }
        const r = redirectToStaffLogin();
        if (isDev && pathname === "/admin/qa/cabinet-lab") r.headers.set("x-redirect-reason", "login.required");
        return r;
      }

      const isBillingOrRegistry =
        pathname.startsWith("/admin/billing") ||
        pathname.startsWith("/admin/registry") ||
        pathname.startsWith("/api/admin/billing") ||
        pathname.startsWith("/api/admin/registry");
      const isSystemSettings =
        pathname.startsWith("/admin/qa") ||
        pathname.startsWith("/admin/settings") ||
        pathname.startsWith("/admin/feature-flags") ||
        pathname.startsWith("/admin/users") ||
        pathname.startsWith("/api/admin/qa") ||
        pathname.startsWith("/api/admin/settings") ||
        pathname.startsWith("/api/admin/feature-flags") ||
        pathname.startsWith("/api/admin/users");

      const allowAdmin = isAdminRole(normalizedRole);
      const allowOffice =
        isOfficeRole(normalizedRole) && isBillingOrRegistry && !isSystemSettings;
      const allow = allowAdmin || allowOffice;

      if (!allow) {
        logAuthEvent({
          action: "rbac_deny",
          path: pathname,
          role: normalizedRole,
          userId: null,
          status: 403,
          latencyMs: 0,
          requestId,
          message: `Admin/billing access denied for role: ${normalizedRole}`,
        });
        if (isDev) {
          console.warn("[proxy] /admin доступ запрещен:", {
            path: pathname,
            normalizedRole,
            isBillingOrRegistry,
            isSystemSettings,
          });
          console.log("[guard-redirect]", { path: pathname, role: String(normalizedRole), reason: "admin.only", redirectTo: "/forbidden" });
        }
        if (isApiAdmin) {
          const apiResponse = NextResponse.json({ error: "forbidden" }, { status: 403 });
          apiResponse.headers.set(REQUEST_ID_HEADER, requestId);
          return apiResponse;
        }
        const url = new URL("/forbidden", request.url);
        url.searchParams.set("reason", "admin.only");
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.headers.set(REQUEST_ID_HEADER, requestId);
        redirectResponse.headers.set("x-auth-source", "middleware");
        redirectResponse.headers.set("x-auth-reason", "admin.only");
        redirectResponse.headers.set("x-auth-guard", "admin.only");
        if (isDev && pathname === "/admin/qa/cabinet-lab") redirectResponse.headers.set("x-redirect-reason", "admin.only");
        return redirectResponse;
      }
    }

    // /office/** - для office roles + admin
    // КРИТИЧНО: Используем isOfficeRole и isAdminRole для строгой проверки normalizedRole
    if (isOfficePath) {
      if (!hasAuth) {
        if (isDev) {
          console.log("[guard-redirect]", { path: pathname, role: String(normalizedRole ?? "null"), reason: "login.required", redirectTo: STAFF_LOGIN_PATH });
        }
        return redirectToStaffLogin();
      }
      // Проверяем office role (chairman, secretary, accountant) или admin через helper функции
      const isOfficeAccess = isOfficeRole(normalizedRole) || isAdminRole(normalizedRole);
      if (!isOfficeAccess) {
        // Sprint 7.6: Подробный лог redirect-chain для диагностики
        const redirectChainLog = {
          source: "proxy",
          file: "proxy.ts",
          function: "proxy",
          line: "~299",
          condition: "!isOfficeAccess",
          path: pathname,
          role,
          effectiveRole,
          normalizedRole,
          isOfficeRole: isOfficeRole(normalizedRole),
          isAdminRole: isAdminRole(normalizedRole),
          hasSession,
          requestId,
        };
        logAuthEvent({
          action: "rbac_deny",
          path: pathname,
          role: normalizedRole,
          userId: null,
          status: 403,
          latencyMs: 0,
          requestId,
          message: `Office access denied for role: ${normalizedRole}`,
        });
        if (isDev) {
          console.warn("[proxy] /office доступ запрещен:", redirectChainLog);
          console.log("[guard-redirect]", { path: pathname, role: String(normalizedRole), reason: "office.only", redirectTo: "/forbidden" });
        }
        const url = new URL("/forbidden", request.url);
        url.searchParams.set("reason", "office.only");
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.headers.set(REQUEST_ID_HEADER, requestId);
        // Диагностические заголовки для матрицы доступов
        redirectResponse.headers.set("x-auth-source", "middleware");
        redirectResponse.headers.set("x-auth-reason", "office.only");
        redirectResponse.headers.set("x-auth-guard", "office.only");
        // Sprint 7.6: Логируем подробную информацию о редиректе в заголовок для отладки
        redirectResponse.headers.set("x-redirect-chain-log", JSON.stringify(redirectChainLog));
        return redirectResponse;
      }
    }

    // /cabinet/** - для resident + office roles (chairman/secretary/accountant) + admin bypass
    if (isCabinetPath) {
      if (!hasAuth) {
        if (isDev) {
          console.log("[guard-redirect]", { path: pathname, role: String(normalizedRole ?? "null"), reason: "login.required", redirectTo: USER_LOGIN_PATH });
        }
        const r = redirectToUserLogin();
        if (isDev) r.headers.set("x-redirect-reason", "login.required");
        return r;
      }
      // КРИТИЧНО: admin и office роли имеют доступ к /cabinet
      if (isAdminRole(normalizedRole)) {
        // admin bypass - пропускаем
      } else if (isOfficeRole(normalizedRole)) {
        // office роли (chairman/secretary/accountant) имеют доступ к /cabinet
        // пропускаем
      } else if (normalizedRole !== "resident") {
        if (isDev) {
          console.log("[guard-redirect]", { path: pathname, role: String(normalizedRole), reason: "cabinet.only", redirectTo: "/forbidden" });
        }
        logAuthEvent({
          action: "rbac_deny",
          path: pathname,
          role: normalizedRole,
          userId: null,
          status: 403,
          latencyMs: 0,
          requestId,
          message: `Cabinet access denied for role: ${normalizedRole}`,
        });
        const url = new URL("/forbidden", request.url);
        url.searchParams.set("reason", "cabinet.only");
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.headers.set(REQUEST_ID_HEADER, requestId);
        redirectResponse.headers.set("x-auth-source", "middleware");
        redirectResponse.headers.set("x-auth-reason", "cabinet.only");
        redirectResponse.headers.set("x-auth-guard", "cabinet.only");
        if (isDev) redirectResponse.headers.set("x-redirect-reason", "cabinet.only");
        return redirectResponse;
      }
    }

    // Dev: заголовок для тестера — причина редиректа (none = редиректа не было)
    if (isDev && (isCabinetPath || pathname === "/admin/qa/cabinet-lab")) {
      response.headers.set("x-redirect-reason", "none");
    }
    return response;
  } catch (error) {
    const requestId = request.headers.get(REQUEST_ID_HEADER) || edgeRequestId();
    const { role } = readSessionRole(request);
    console.error("[proxy-error]", {
      requestId,
      route: request.nextUrl.pathname,
      role: role ?? "none",
      error: error instanceof Error ? error.message : String(error),
    });
    const errorResponse = NextResponse.next();
    errorResponse.headers.set(REQUEST_ID_HEADER, requestId);
    return errorResponse;
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
