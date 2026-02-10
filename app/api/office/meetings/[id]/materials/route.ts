export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { addMaterial, getMeetingById, listMaterials, hasPgConnection } from "@/lib/meetings.pg";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, "meetings.manage", { route: "/api/office/meetings/:id/materials" });
  if (guard instanceof Response) return guard;
  if (!hasPgConnection()) return ok(request, { materials: [] });

  try {
    const { id } = await params;
    const materials = await listMaterials(id);
    return ok(request, { materials });
  } catch (error) {
    return serverError(request, "Ошибка загрузки материалов", error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, "meetings.manage", { route: "/api/office/meetings/:id/materials" });
  if (guard instanceof Response) return guard;
  if (!hasPgConnection()) return fail(request, "pg_missing", "Postgres не настроен", 503);

  try {
    const { id } = await params;
    const meeting = await getMeetingById(id);
    if (!meeting) return fail(request, "not_found", "Meeting not found", 404);
    const body = await request.json().catch(() => ({}));
    const documentId = typeof body.documentId === "string" ? body.documentId : null;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const visibility = body.visibility === "office" ? "office" : "residents";
    if (!title) return fail(request, "validation_error", "title обязателен", 400);

    const material = await addMaterial({
      meetingId: id,
      documentId,
      title,
      visibility,
      createdBy: guard.session.id ?? null,
    });
    await logAdminAction({
      action: "meetings.material.add",
      entity: "meetings",
      entityId: id,
      meta: { materialId: material?.id ?? null },
      headers: request.headers,
    });
    return ok(request, { material });
  } catch (error) {
    return serverError(request, "Ошибка добавления материала", error);
  }
}
