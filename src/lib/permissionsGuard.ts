import "server-only";

import { unauthorized, forbidden } from "@/lib/api/respond";
import { getRequestId } from "@/lib/api/requestId";
import { logAdminAction } from "@/lib/audit";
import type { Role, PermissionAction } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { logAuthEvent } from "@/lib/structuredLogger/node";

type PermissionOk = {
  session: Awaited<ReturnType<typeof getEffectiveSessionUser>>;
  role: Role;
  requestId: string;
};

type PermissionFail = Response;

export async function requirePermission(
  request: Request,
  action: PermissionAction,
  options?: {
    route?: string;
    deniedReason?: string;
  }
): Promise<PermissionOk | PermissionFail> {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";
  const requestId = getRequestId(request);
  const route = options?.route ?? new URL(request.url).pathname;

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: route,
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    await logAdminAction({
      action: "rbac.deny",
      entity: action,
      entityId: null,
      meta: { requestId, action },
      route,
      success: false,
      deniedReason: "UNAUTHORIZED",
      headers: request.headers,
    });
    return unauthorized(request);
  }

  if (!hasPermission(role, action)) {
    logAuthEvent({
      action: "rbac_deny",
      path: route,
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    await logAdminAction({
      action: "rbac.deny",
      entity: action,
      entityId: null,
      meta: { requestId, action },
      route,
      success: false,
      deniedReason: options?.deniedReason ?? "FORBIDDEN",
      headers: request.headers,
    });
    return forbidden(request);
  }

  return { session, role, requestId };
}
