import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listAuditLogs } from "@/lib/mockDb";
import { formatAdminTime } from "@/lib/settings.shared";
import { forbidden, ok, unauthorized, serverError } from "@/lib/api/respond";

type ParamsPromise<T> = { params: Promise<T> };

export async function GET(request: Request, { params }: ParamsPromise<{ id: string }>) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return unauthorized(request, "unauthorized");
    if (!hasAdminAccess(user)) return forbidden(request, "forbidden");

    const logs = listAuditLogs({ entity: "plot", entityId: id, limit: 20 });
    const items = logs.map((log) => ({
      id: log.id,
      createdAtIso: log.createdAt,
      createdAtLocalFormatted: formatAdminTime(log.createdAt),
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      comment: log.comment ?? null,
      actorUserId: log.actorUserId,
      actorRole: log.actorRole,
    }));

    return ok(request, { items });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
