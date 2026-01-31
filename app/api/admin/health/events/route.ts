import { ok, unauthorized, forbidden } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listErrorEvents } from "@/lib/errorEvents.store";
import { listAuditLogs } from "@/lib/mockDb";
import { listAuditLog } from "@/lib/auditLog.store";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }
  if (!hasAdminAccess(user)) {
    return forbidden(request);
  }

  const errors = listErrorEvents({ limit: 50 });
  const adminAudit = listAuditLogs({ limit: 50 });
  const auditEntries = listAuditLog({ limit: 50 });

  return ok(request, { errors, adminAudit, auditEntries });
}
