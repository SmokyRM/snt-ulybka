import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { logAdminAction } from "@/lib/audit";
import {
  listWorks,
  createWork,
  type WorkStatus,
  type WorkRecord,
} from "@/lib/office/works.store";
import { uploadOfficeDocumentFile } from "@/lib/office/documentUpload.server";

const canEdit = (role: Role) => role === "admin" || role === "chairman";
const canView = (role: Role) => role === "admin" || role === "chairman" || role === "secretary";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/works",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role) || !canView(role)) {
    return forbidden(request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as WorkStatus | null;
    const period = searchParams.get("period");
    const location = searchParams.get("location");
    const contractor = searchParams.get("contractor");
    const appealId = searchParams.get("appealId");
    const documentId = searchParams.get("documentId");

    const items = listWorks({
      status: status || null,
      period: period || null,
      location: location || null,
      contractor: contractor || null,
      appealId: appealId || null,
      documentId: documentId || null,
    });

    return ok(request, { items });
  } catch (error) {
    return serverError(request, "Ошибка загрузки работ", error);
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/works",
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
    const contentType = request.headers.get("content-type") ?? "";
    let payload: Partial<WorkRecord> = {};
    let photoBeforeUrls: string[] = [];
    let photoAfterUrls: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      payload = {
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        location: String(formData.get("location") ?? ""),
        plotId: String(formData.get("plotId") ?? "") || null,
        contractorName: String(formData.get("contractorName") ?? "") || null,
        cost: Number(formData.get("cost") ?? 0),
        status: (String(formData.get("status") ?? "planned") as WorkStatus) ?? "planned",
        startedAt: String(formData.get("startedAt") ?? "") || null,
        finishedAt: String(formData.get("finishedAt") ?? "") || null,
        linkedAppealIds: String(formData.get("linkedAppealIds") ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        linkedDocumentIds: String(formData.get("linkedDocumentIds") ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      } as Partial<WorkRecord>;

      const beforeFiles = formData.getAll("photoBefore").filter((f) => f instanceof File) as File[];
      const afterFiles = formData.getAll("photoAfter").filter((f) => f instanceof File) as File[];
      for (const file of beforeFiles) {
        const uploaded = await uploadOfficeDocumentFile(file);
        photoBeforeUrls.push(uploaded.fileUrl);
      }
      for (const file of afterFiles) {
        const uploaded = await uploadOfficeDocumentFile(file);
        photoAfterUrls.push(uploaded.fileUrl);
      }

      const beforeUrls = String(formData.get("photoBeforeUrls") ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const afterUrls = String(formData.get("photoAfterUrls") ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      photoBeforeUrls = [...photoBeforeUrls, ...beforeUrls];
      photoAfterUrls = [...photoAfterUrls, ...afterUrls];
    } else {
      const body = await request.json().catch(() => ({}));
      payload = body ?? {};
      photoBeforeUrls = Array.isArray(body.photoBeforeUrls) ? body.photoBeforeUrls : [];
      photoAfterUrls = Array.isArray(body.photoAfterUrls) ? body.photoAfterUrls : [];
    }

    if (!payload.title || !payload.location) {
      return badRequest(request, "Название и место обязательны");
    }

    const record = createWork({
      title: payload.title,
      description: payload.description ?? "",
      location: payload.location,
      plotId: payload.plotId ?? null,
      contractorName: payload.contractorName ?? null,
      cost: Number(payload.cost ?? 0),
      status: (payload.status as WorkStatus) ?? "planned",
      startedAt: payload.startedAt ?? null,
      finishedAt: payload.finishedAt ?? null,
      photoBeforeUrls,
      photoAfterUrls,
      linkedAppealIds: payload.linkedAppealIds ?? [],
      linkedDocumentIds: payload.linkedDocumentIds ?? [],
      createdBy: session.id ?? null,
    });

    await logAdminAction({
      action: "work.create",
      entity: "work",
      entityId: record.id,
      route: "/api/office/works",
      success: true,
      meta: { title: record.title },
      headers: request.headers,
    });

    return ok(request, { record });
  } catch (error) {
    return serverError(request, "Ошибка создания работы", error);
  }
}
