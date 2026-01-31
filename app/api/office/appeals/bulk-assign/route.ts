/**
 * Sprint 34: Bulk assign appeals to a user
 */
import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission, isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { assignToUser } from "@/server/services/appeals";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/appeals/bulk-assign",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role) || !hasPermission(role, "appeals.bulk_update")) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/appeals/bulk-assign",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string") : [];
    const assigneeUserId = typeof body.assigneeUserId === "string" ? body.assigneeUserId : null;

    if (!ids.length || !assigneeUserId) {
      return fail(request, "validation_error", "ids и assigneeUserId обязательны", 400);
    }

    let updated = 0;
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of ids) {
      try {
        await assignToUser(id, assigneeUserId);
        updated += 1;
      } catch (error) {
        failed.push({ id, reason: error instanceof Error ? error.message : "UNKNOWN" });
      }
    }

    return ok(request, { updated, failedCount: failed.length, failed });
  } catch (error) {
    return serverError(request, "Ошибка массового назначения", error);
  }
}
