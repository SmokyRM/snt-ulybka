import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole, normalizeRole } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/edge";
import { getRequestId } from "@/lib/api/requestId";
import type { NextRequest } from "next/server";

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  role: string | null;
}

/**
 * Проверяет доступ для admin + office ролей
 * Админ имеет доступ везде, office роли (chairman/secretary/accountant) имеют доступ к office разделам
 */
export async function checkAdminOrOfficeAccess(
  request: Request | NextRequest,
  options?: {
    allowOffice?: boolean; // По умолчанию true - office роли имеют доступ
    allowAdmin?: boolean; // По умолчанию true - admin имеет доступ
    logAccess?: boolean; // По умолчанию true - логировать доступ
  }
): Promise<AccessCheckResult> {
  const { allowOffice = true, allowAdmin = true, logAccess = true } = options || {};
  const user = await getSessionUser();
  
  // Получаем pathname из request
  let pathname = "/";
  try {
    // Проверяем, есть ли nextUrl (NextRequest) или используем обычный URL
    if ("nextUrl" in request && request.nextUrl) {
      pathname = request.nextUrl.pathname;
    } else {
      const url = new URL(request.url);
      pathname = url.pathname;
    }
  } catch {
    // Fallback
  }
  
  if (!user) {
    if (logAccess) {
      const requestId = getRequestId(request);
      logAuthEvent({
        action: "rbac_deny",
        path: pathname,
        role: null,
        userId: null,
        status: 401,
        latencyMs: 0,
        requestId,
        message: "Unauthorized: no session",
      });
    }
    return { allowed: false, reason: "unauthorized", role: null };
  }

  const role = user.role;
  const normalizedRole = normalizeRole(role);
  const isAdmin = allowAdmin && hasAdminAccess(user);
  const isOffice = allowOffice && (isOfficeRole(normalizedRole) || isAdminRole(normalizedRole));

  const allowed = isAdmin || isOffice;

  if (logAccess && !allowed) {
    const requestId = getRequestId(request);
    logAuthEvent({
      action: "rbac_deny",
      path: pathname,
      role: normalizedRole,
      userId: user.id || null,
      status: 403,
      latencyMs: 0,
      requestId,
      message: `Access denied: role=${normalizedRole}, isAdmin=${isAdmin}, isOffice=${isOffice}`,
    });
  }

  return {
    allowed,
    reason: allowed ? undefined : "forbidden",
    role: normalizedRole,
  };
}

/**
 * Проверяет доступ только для admin
 */
export async function checkAdminAccess(
  request: Request | NextRequest,
  options?: {
    logAccess?: boolean;
  }
): Promise<AccessCheckResult> {
  return checkAdminOrOfficeAccess(request, {
    allowOffice: false,
    allowAdmin: true,
    logAccess: options?.logAccess,
  });
}
