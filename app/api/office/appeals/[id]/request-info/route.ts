import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin, hasPermission } from "@/lib/rbac";
import { requestInfoWithTemplate } from "@/server/services/appealsAutoActions";
import { getRequestId } from "@/lib/api/requestId";
import { logApiRequest } from "@/lib/structuredLogger/node";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = getRequestId(_request);
  const pathname = new URL(_request.url).pathname;
  const { id } = await params;

  try {
    const user = await getEffectiveSessionUser();
    if (!user) {
      logApiRequest({
        path: pathname,
        method: "POST",
        role: null,
        userId: null,
        status: 401,
        latencyMs: Date.now() - startTime,
        requestId,
      });
      return unauthorized(_request);
    }

    const role = (user.role as Role | undefined) ?? "resident";
    if (!isStaffOrAdmin(role)) {
      logApiRequest({
        path: pathname,
        method: "POST",
        role,
        userId: user.id ?? null,
        status: 403,
        latencyMs: Date.now() - startTime,
        requestId,
      });
      return forbidden(_request);
    }

    if (!hasPermission(role, "appeals.view")) {
      logApiRequest({
        path: pathname,
        method: "POST",
        role,
        userId: user.id ?? null,
        status: 403,
        latencyMs: Date.now() - startTime,
        requestId,
      });
      return forbidden(_request);
    }

    const result = await requestInfoWithTemplate(id);

    const latencyMs = Date.now() - startTime;
    logApiRequest({
      path: pathname,
      method: "POST",
      role,
      userId: user.id ?? null,
      status: result.success ? 200 : 400,
      latencyMs,
      requestId,
    });

    if (!result.success) {
      return fail(_request, "bad_request", result.message || "Не удалось запросить информацию", 400);
    }

    return ok(_request, { message: result.message || "" });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logApiRequest({
      path: pathname,
      method: "POST",
      role: null,
      userId: null,
      status: 500,
      latencyMs,
      requestId,
      error: errorMessage,
    });

    return serverError(_request, "Ошибка при запросе дополнительной информации", error);
  }
}
