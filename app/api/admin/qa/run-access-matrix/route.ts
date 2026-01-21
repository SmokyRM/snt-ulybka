import { getSessionUser, getEffectiveSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getQaScenarioFromCookies } from "@/lib/qaScenario.server";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { normalizeRole } from "@/lib/rbac";
import { cookies } from "next/headers";
import { upsertUserById } from "@/lib/mockDb";
import { fail, forbidden, methodNotAllowed, ok, serverError } from "@/lib/api/respond";

type Role = "guest" | "resident" | "chairman" | "secretary" | "accountant" | "admin";
type Route =
  | "/cabinet"
  | "/office"
  | "/admin"
  | "/login"
  | "/staff-login"
  | "/forbidden"
  | "/"
  | "/admin/billing/accruals"
  | "/admin/billing/debts"
  | "/admin/billing/debtors"
  | "/admin/billing/notifications"
  | "/admin/billing/payments/import"
  | "/admin/billing/payments/imports";
type TestResult = "ALLOW" | "LOGIN_REQUIRED" | "FORBIDDEN" | "SERVER_ERROR";

type MatrixRouteResult = {
  result: TestResult;
  httpStatus: number;
  finalUrl: string;
  redirectTo?: string;
  reason?: string;
  redirectChain: Array<{ from: string; to: string; status: number }>;
  loginType: "login" | "staff-login" | null;
  timingMs: number;
  traceHeaders: Record<string, string>;
  expected: TestResult;
  actual: TestResult;
  matchesExpected: boolean;
};

const ROLES: Role[] = ["guest", "resident", "chairman", "secretary", "accountant", "admin"];
const ROUTES: Route[] = [
  "/cabinet",
  "/office",
  "/admin",
  "/login",
  "/staff-login",
  "/forbidden",
  "/",
  "/admin/billing/accruals",
  "/admin/billing/debts",
  "/admin/billing/debtors",
  "/admin/billing/notifications",
  "/admin/billing/payments/import",
  "/admin/billing/payments/imports",
];

const ROLE_USER_IDS: Record<string, string> = {
  admin: "user-admin-root",
  resident: "user-resident-default",
  chairman: "user-chairman-default",
  accountant: "user-accountant-default",
  secretary: "user-secretary-default",
};

// Таблица ожиданий
const EXPECTED: Record<Role, Record<Route, TestResult>> = {
  guest: {
    "/cabinet": "LOGIN_REQUIRED",
    "/office": "LOGIN_REQUIRED",
    "/admin": "LOGIN_REQUIRED",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
    "/admin/billing/accruals": "LOGIN_REQUIRED",
    "/admin/billing/debts": "LOGIN_REQUIRED",
    "/admin/billing/debtors": "LOGIN_REQUIRED",
    "/admin/billing/notifications": "LOGIN_REQUIRED",
    "/admin/billing/payments/import": "LOGIN_REQUIRED",
    "/admin/billing/payments/imports": "LOGIN_REQUIRED",
  },
  resident: {
    "/cabinet": "ALLOW",
    "/office": "FORBIDDEN",
    "/admin": "FORBIDDEN",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
    "/admin/billing/accruals": "FORBIDDEN",
    "/admin/billing/debts": "FORBIDDEN",
    "/admin/billing/debtors": "FORBIDDEN",
    "/admin/billing/notifications": "FORBIDDEN",
    "/admin/billing/payments/import": "FORBIDDEN",
    "/admin/billing/payments/imports": "FORBIDDEN",
  },
  chairman: {
    "/cabinet": "ALLOW",
    "/office": "ALLOW",
    "/admin": "FORBIDDEN",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
    "/admin/billing/accruals": "ALLOW",
    "/admin/billing/debts": "ALLOW",
    "/admin/billing/debtors": "ALLOW",
    "/admin/billing/notifications": "ALLOW",
    "/admin/billing/payments/import": "ALLOW",
    "/admin/billing/payments/imports": "ALLOW",
  },
  secretary: {
    "/cabinet": "ALLOW",
    "/office": "ALLOW",
    "/admin": "FORBIDDEN",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
    "/admin/billing/accruals": "ALLOW",
    "/admin/billing/debts": "ALLOW",
    "/admin/billing/debtors": "ALLOW",
    "/admin/billing/notifications": "ALLOW",
    "/admin/billing/payments/import": "ALLOW",
    "/admin/billing/payments/imports": "ALLOW",
  },
  accountant: {
    "/cabinet": "ALLOW",
    "/office": "ALLOW",
    "/admin": "FORBIDDEN",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
    "/admin/billing/accruals": "ALLOW",
    "/admin/billing/debts": "ALLOW",
    "/admin/billing/debtors": "ALLOW",
    "/admin/billing/notifications": "ALLOW",
    "/admin/billing/payments/import": "ALLOW",
    "/admin/billing/payments/imports": "ALLOW",
  },
  admin: {
    "/cabinet": "ALLOW",
    "/office": "ALLOW",
    "/admin": "ALLOW",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
    "/admin/billing/accruals": "ALLOW",
    "/admin/billing/debts": "ALLOW",
    "/admin/billing/debtors": "ALLOW",
    "/admin/billing/notifications": "ALLOW",
    "/admin/billing/payments/import": "ALLOW",
    "/admin/billing/payments/imports": "ALLOW",
  },
};

// Получает cookie для роли через реальный логин
async function getCookieForRole(role: Role, baseUrl: string): Promise<string | null> {
  if (role === "guest") {
    return null; // Без cookie
  }

  try {
    // Для staff ролей (admin/chairman/secretary/accountant) делаем реальный логин
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
      
      // Создаём пользователя в БД перед логином (как в реальном login endpoint)
      upsertUserById({ id: userId, role });
      
      if (!password) {
        // Если пароль не установлен, используем fallback - формируем cookie вручную
        const payload = JSON.stringify({ role, userId });
        return `snt_session=${encodeURIComponent(payload)}`;
      }

      // Вызываем реальный staff-login endpoint
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
        // Fallback - формируем cookie вручную
        const payload = JSON.stringify({ role, userId });
        return `snt_session=${encodeURIComponent(payload)}`;
      }

      // Извлекаем cookie из Set-Cookie заголовка
      // Set-Cookie может быть строкой или массивом
      const setCookieHeader = loginResponse.headers.get("set-cookie");
      if (setCookieHeader) {
        // Парсим Set-Cookie: snt_session=...; path=/; ...
        // Может быть несколько Set-Cookie заголовков, берем первый с snt_session
        const setCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        for (const cookieStr of setCookies) {
          const match = cookieStr.match(/snt_session=([^;]+)/);
          if (match && match[1]) {
            return `snt_session=${match[1]}`;
          }
        }
      }

      // Fallback - формируем cookie вручную
      const payload = JSON.stringify({ role, userId });
      return `snt_session=${encodeURIComponent(payload)}`;
    }

    // Для resident - вызываем реальный resident-login endpoint
    if (role === "resident") {
      const userId = ROLE_USER_IDS[role];
      if (!userId) return null;
      
      // Создаём пользователя в БД перед логином
      upsertUserById({ id: userId, role });

      // Вызываем реальный resident-login endpoint
      const loginUrl = new URL("/api/auth/resident-login", baseUrl);
      const loginResponse = await fetch(loginUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: "resident",
        }),
      });

      if (!loginResponse.ok) {
        // Fallback - формируем cookie вручную
        const payload = JSON.stringify({ role, userId });
        return `snt_session=${encodeURIComponent(payload)}`;
      }

      // Извлекаем cookie из Set-Cookie заголовка
      const setCookieHeader = loginResponse.headers.get("set-cookie");
      if (setCookieHeader) {
        // Парсим Set-Cookie: snt_session=...; path=/; ...
        const setCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        for (const cookieStr of setCookies) {
          const match = cookieStr.match(/snt_session=([^;]+)/);
          if (match && match[1]) {
            return `snt_session=${match[1]}`;
          }
        }
      }

      // Fallback - формируем cookie вручную
      const payload = JSON.stringify({ role, userId });
      return `snt_session=${encodeURIComponent(payload)}`;
    }

    return null;
  } catch (error) {
    // В случае ошибки - fallback на ручное формирование cookie
    const userId = ROLE_USER_IDS[role];
    if (!userId) return null;
    const payload = JSON.stringify({ role, userId });
    return `snt_session=${encodeURIComponent(payload)}`;
  }
}

// Классифицирует результат запроса
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
  // Проверяем что это редирект на /forbidden с reason
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
    // Проверяем что это не целевой маршрут
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

// Следует редиректам и собирает цепочку
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

  const headers: HeadersInit = {
    "Cache-Control": "no-store",
  };

  if (cookie) {
    headers["Cookie"] = cookie;
  }

  for (let i = 0; i < maxRedirects; i++) {
    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers,
      });

      finalStatus = response.status;
      // response.url может быть другим из-за редиректов, используем его
      const responseUrl = response.url || currentUrl;
      finalUrl = responseUrl;

      // Собираем диагностические заголовки (приоритет последнего ответа)
      const authSource = response.headers.get("x-auth-source");
      const authReason = response.headers.get("x-auth-reason");
      const authGuard = response.headers.get("x-auth-guard");
      const requestId = response.headers.get("x-request-id");

      if (authSource) traceHeaders["x-auth-source"] = authSource;
      if (authReason) traceHeaders["x-auth-reason"] = authReason;
      if (authGuard) traceHeaders["x-auth-guard"] = authGuard;
      if (requestId) traceHeaders["x-request-id"] = requestId;

      // Если это редирект, продолжаем следовать
      if (finalStatus >= 300 && finalStatus < 400) {
        const location = response.headers.get("Location");
        if (location) {
          let nextUrl: string;
          try {
            const redirectUrl = new URL(location, baseUrl);
            nextUrl = redirectUrl.toString();
          } catch {
            nextUrl = location.startsWith("/") ? new URL(location, baseUrl).toString() : new URL(`/${location}`, baseUrl).toString();
          }

          // Нормализуем URL для отображения (убираем baseUrl)
          const fromNormalized = currentUrl.replace(baseUrl, "") || "/";
          const toNormalized = nextUrl.replace(baseUrl, "") || "/";

          redirectChain.push({
            from: fromNormalized,
            to: toNormalized,
            status: finalStatus,
          });

          currentUrl = nextUrl;
          continue;
        }
      }

      // Не редирект или нет Location - завершаем
      break;
    } catch (error) {
      // В случае ошибки возвращаем то что собрали
      const errorUrlNormalized = currentUrl.replace(baseUrl, "") || "/";
      return {
        finalStatus: 0,
        finalUrl: errorUrlNormalized,
        redirectChain,
        traceHeaders,
      };
    }
  }

  // Нормализуем finalUrl (убираем baseUrl, оставляем только pathname + search)
  let finalUrlNormalized: string;
  try {
    const finalUrlObj = new URL(finalUrl, baseUrl);
    finalUrlNormalized = finalUrlObj.pathname + finalUrlObj.search;
  } catch {
    // Если не удалось распарсить, просто убираем baseUrl
    finalUrlNormalized = finalUrl.replace(baseUrl, "") || "/";
  }

  return {
    finalStatus,
    finalUrl: finalUrlNormalized,
    redirectChain,
    traceHeaders,
  };
}

// Проверяет маршрут для роли с полной диагностикой
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
  loginType: "login" | "staff-login" | null;
  timingMs: number;
  traceHeaders: Record<string, string>;
}> {
  const startTime = Date.now();
  const url = new URL(route, baseUrl);

  try {
    // Следуем редиректам и собираем диагностику
    const { finalStatus, finalUrl, redirectChain, traceHeaders } = await followRedirects(
      url.toString(),
      cookie,
      baseUrl
    );

    const timingMs = Date.now() - startTime;

    // Определяем loginType
    let loginType: "login" | "staff-login" | null = null;
    if (finalUrl.includes("/login") && !finalUrl.includes("/staff")) {
      loginType = "login";
    } else if (finalUrl.includes("/staff-login") || finalUrl.includes("/staff/login")) {
      loginType = "staff-login";
    }

    // Извлекаем reason и src из finalUrl
    let reason: string | undefined;
    let srcFromUrl: string | undefined;
    try {
      const finalUrlObj = new URL(finalUrl, "http://localhost");
      if (finalUrlObj.pathname === "/forbidden") {
        reason = finalUrlObj.searchParams.get("reason") || undefined;
        srcFromUrl = finalUrlObj.searchParams.get("src") || undefined;
      }
    } catch {
      // Ignore
    }

    // Приоритет: заголовок x-auth-source > src из URL
    const authSource = traceHeaders["x-auth-source"] || srcFromUrl || undefined;
    if (authSource && !traceHeaders["x-auth-source"]) {
      traceHeaders["x-auth-source"] = authSource;
    }

    // Классифицируем результат (передаём route для правильной классификации целевых маршрутов)
    const redirectTo = redirectChain.length > 0 ? redirectChain[redirectChain.length - 1].to : undefined;
    const { result } = classifyResult(finalStatus, finalUrl, route, redirectTo, redirectChain);

    return {
      result,
      httpStatus: finalStatus,
      finalUrl,
      redirectTo,
      reason,
      redirectChain,
      loginType,
      timingMs,
      traceHeaders,
    };
  } catch (error) {
    return {
      result: "SERVER_ERROR",
      httpStatus: 0,
      finalUrl: route,
      redirectChain: [],
      loginType: null,
      timingMs: Date.now() - startTime,
      traceHeaders: {},
    };
  }
}

export async function POST(request: Request) {
  try {
    // Fail-closed: проверка метода
    if (request.method !== "POST") {
      return methodNotAllowed(request, ["POST"]);
    }

    // RBAC: проверка доступа (admin или QA secret)
    const user = await getSessionUser();
    const isAdmin = user && hasAdminAccess(user);
    
    // Optional QA secret для тестирования без admin сессии
    const body = await request.json().catch(() => ({}));
    const qaSecret = (body.qaSecret as string | undefined)?.trim();
    const validQaSecret = qaSecret === process.env.QA_SECRET?.trim();
    
    if (!isAdmin && !validQaSecret) {
      return forbidden(request, "forbidden");
    }

    // Fail-closed: только dev + ENABLE_QA (опционально)
    if (process.env.NODE_ENV === "production" && !process.env.ENABLE_QA) {
      return fail(request, "not_found", "not_found", 404);
    }

    // CSRF защита
    const originCheck = verifySameOrigin(request);
    if (!originCheck.ok) {
      return forbidden(request, "Запрос отклонён по политике безопасности (origin).");
    }

    // Получаем baseUrl из запроса
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Получаем информацию о текущей сессии (не имитируемой, а реальной сессии пользователя)
    const cookieStore = await cookies();
    const sessionUser = await getSessionUser();
    const effectiveUser = await getEffectiveSessionUser();
    const qaScenario = await getQaScenarioFromCookies(cookieStore);
    
    // Определяем источник сессии
    let sessionSource: "cookie" | "qa" | "none" = "none";
    if (qaScenario) {
      sessionSource = "qa";
    } else if (sessionUser) {
      sessionSource = "cookie";
    }

    // Получаем роли
    const currentSessionRole = sessionUser?.role || null;
    const effectiveRole = effectiveUser?.role || null;
    const normalizedRole = currentSessionRole ? normalizeRole(currentSessionRole) : null;

    // Проверяем наличие cookies
    const sntSessionCookie = cookieStore.get("snt_session");
    const qaCookie = cookieStore.get("qa");
    
    const sessionContext = {
      currentSessionRole: currentSessionRole || null,
      effectiveRole: effectiveRole || null,
      normalizedRole: normalizedRole || null,
      sessionSource,
      cookiePresent: {
        snt_session: !!sntSessionCookie,
        qaCookie: !!qaCookie,
      },
    };

    // Выполняем проверки для всех комбинаций роль-маршрут
    const results: Record<Role, Record<Route, MatrixRouteResult>> = {} as Record<Role, Record<Route, MatrixRouteResult>>;

    // Кэш cookies для каждой роли (чтобы не логиниться повторно)
    const roleCookies: Record<Role, string | null> = {} as Record<Role, string | null>;
    
    for (const role of ROLES) {
      // Получаем cookie для роли один раз перед прогоном всех маршрутов
      roleCookies[role] = await getCookieForRole(role, baseUrl);
      
      results[role] = {} as Record<Route, MatrixRouteResult>;
      for (const route of ROUTES) {
        // Используем кэшированный cookie для роли
        const checkResult = await checkRoute(role, route, baseUrl, roleCookies[role] ?? null);
        const expected = EXPECTED[role][route];
        const actual = checkResult.result;
        const matchesExpected = expected === actual;

        results[role][route] = {
          ...checkResult,
          expected,
          actual,
          matchesExpected,
        };

        // Небольшая задержка между запросами чтобы не перегружать сервер
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    return ok(request, { results, sessionContext });
  } catch (error) {
    console.error("[run-access-matrix] Error:", error);
    return serverError(request, "Internal server error", error);
  }
}
