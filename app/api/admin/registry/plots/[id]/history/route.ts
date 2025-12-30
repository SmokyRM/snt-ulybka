import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listAuditLogs } from "@/lib/mockDb";
import { formatAdminTime } from "@/lib/settings.shared";

type ParamsPromise<T> = { params: Promise<T> };

export async function GET(_request: Request, { params }: ParamsPromise<{ id: string }>) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

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

  return NextResponse.json({ ok: true, items });
}
