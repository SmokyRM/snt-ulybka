export const runtime = "nodejs";

import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isResidentRole } from "@/lib/rbac";
import { listResidentDocuments } from "@/lib/office/documentAccess.server";

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) {
    return unauthorized(request);
  }
  if (!isResidentRole(session.role)) {
    return forbidden(request);
  }

  try {
    const items = await listResidentDocuments(session.id);
    return ok(request, {
      items: items.map((item) => ({
        ...item,
        downloadUrl: `/api/cabinet/documents/${item.id}/download`,
      })),
    });
  } catch (error) {
    return serverError(request, "Ошибка загрузки документов", error);
  }
}
