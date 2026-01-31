import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { logAdminAction } from "@/lib/audit";
import { getWork, updateWork, type WorkStatus } from "@/lib/office/works.store";
import { uploadOfficeDocumentFile } from "@/lib/office/documentUpload.server";

const canEdit = (role: Role) => role === "admin" || role === "chairman";

export async function PUT(request: Request, context: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/works/[id]",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role) || !canEdit(role)) {
    return forbidden(request);
  }

  try {
    const id = context.params.id;
    const existing = getWork(id);
    if (!existing) {
      return badRequest(request, "Работа не найдена");
    }

    const contentType = request.headers.get("content-type") ?? "";
    let patch: Record<string, unknown> = {};
    let photoBeforeUrls: string[] | undefined;
    let photoAfterUrls: string[] | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      patch = {
        title: String(formData.get("title") ?? existing.title),
        description: String(formData.get("description") ?? existing.description),
        location: String(formData.get("location") ?? existing.location),
        plotId: String(formData.get("plotId") ?? existing.plotId ?? "") || null,
        contractorName: String(formData.get("contractorName") ?? existing.contractorName ?? "") || null,
        cost: Number(formData.get("cost") ?? existing.cost),
        status: (String(formData.get("status") ?? existing.status) as WorkStatus) ?? existing.status,
        startedAt: String(formData.get("startedAt") ?? existing.startedAt ?? "") || null,
        finishedAt: String(formData.get("finishedAt") ?? existing.finishedAt ?? "") || null,
      };

      const beforeFiles = formData.getAll("photoBefore").filter((f) => f instanceof File) as File[];
      const afterFiles = formData.getAll("photoAfter").filter((f) => f instanceof File) as File[];
      const beforeUploads: string[] = [];
      const afterUploads: string[] = [];
      for (const file of beforeFiles) {
        const uploaded = await uploadOfficeDocumentFile(file);
        beforeUploads.push(uploaded.fileUrl);
      }
      for (const file of afterFiles) {
        const uploaded = await uploadOfficeDocumentFile(file);
        afterUploads.push(uploaded.fileUrl);
      }
      const beforeUrls = String(formData.get("photoBeforeUrls") ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const afterUrls = String(formData.get("photoAfterUrls") ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      photoBeforeUrls = [...beforeUploads, ...beforeUrls];
      photoAfterUrls = [...afterUploads, ...afterUrls];
    } else {
      const body = await request.json().catch(() => ({}));
      patch = body ?? {};
      photoBeforeUrls = Array.isArray(body.photoBeforeUrls) ? body.photoBeforeUrls : undefined;
      photoAfterUrls = Array.isArray(body.photoAfterUrls) ? body.photoAfterUrls : undefined;
    }

    const updated = updateWork(id, {
      title: patch.title as string | undefined,
      description: patch.description as string | undefined,
      location: patch.location as string | undefined,
      plotId: patch.plotId as string | null | undefined,
      contractorName: patch.contractorName as string | null | undefined,
      cost: typeof patch.cost === "number" ? patch.cost : undefined,
      status: patch.status as WorkStatus | undefined,
      startedAt: patch.startedAt as string | null | undefined,
      finishedAt: patch.finishedAt as string | null | undefined,
      photoBeforeUrls,
      photoAfterUrls,
    });

    if (!updated) {
      return badRequest(request, "Не удалось обновить работу");
    }

    await logAdminAction({
      action: "work.update",
      entity: "work",
      entityId: id,
      route: "/api/office/works/[id]",
      success: true,
      meta: { title: updated.title },
      headers: request.headers,
    });

    return ok(request, { record: updated });
  } catch (error) {
    return serverError(request, "Ошибка обновления работы", error);
  }
}
