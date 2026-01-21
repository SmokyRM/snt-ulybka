import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { createOfficeNote } from "@/lib/officeNotes.store";
import { getRequestId } from "@/lib/api/requestId";
import { logApiRequest } from "@/lib/structuredLogger/node";

type ParamsPromise<T> = {
  params: Promise<T>;
};

export async function POST(
  request: Request,
  { params }: ParamsPromise<{ id: string }>
) {
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const pathname = new URL(request.url).pathname;

  try {
    const { id } = await params;
    const user = await getEffectiveSessionUser();
    if (!user || !user.id) {
      logApiRequest({
        path: pathname,
        method: "POST",
        role: null,
        userId: null,
        status: 401,
        latencyMs: Date.now() - startTime,
        requestId,
      });
      return unauthorized(request);
    }

    const role = (user.role as Role | undefined) ?? "resident";
    if (!isStaffOrAdmin(role)) {
      logApiRequest({
        path: pathname,
        method: "POST",
        role,
        userId: user.id,
        status: 403,
        latencyMs: Date.now() - startTime,
        requestId,
      });
      return forbidden(request);
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      logApiRequest({
        path: pathname,
        method: "POST",
        role,
        userId: user.id,
        status: 400,
        latencyMs: Date.now() - startTime,
        requestId,
      });
      return fail(request, "validation_error", "Текст заметки обязателен", 400);
    }

    const note = createOfficeNote(id, text.trim(), user.id, role);

    const latencyMs = Date.now() - startTime;
    logApiRequest({
      path: pathname,
      method: "POST",
      role,
      userId: user.id,
      status: 200,
      latencyMs,
      requestId,
    });

    return ok(request, { note });
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

    return serverError(request, "Ошибка при создании заметки", error);
  }
}
