export const runtime = "nodejs";

import { ok, badRequest, forbidden, unauthorized, serverError } from "@/lib/api/respond";
import { getNextCursor, parseOffsetPagination } from "@/lib/api/pagination";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import {
  createOfficeDocument,
  listOfficeDocuments,
  type OfficeDocumentType,
} from "@/lib/office/documentsRegistry.store";
import { uploadOfficeDocumentFile } from "@/lib/office/documentUpload.server";
import { logAuthEvent } from "@/lib/structuredLogger/node";

const parseBool = (value: string | null) => {
  if (value === null) return null;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
};

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/docs",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    return forbidden(request);
  }
  if (!can(role === "admin" ? "chairman" : role, "documents.manage")) {
    return forbidden(request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as OfficeDocumentType | null;
    const period = searchParams.get("period");
    const tag = searchParams.get("tag");
    const isPublic = parseBool(searchParams.get("public"));
    const { limit, offset } = parseOffsetPagination(searchParams, { defaultLimit: 20, maxLimit: 100 });

    const allItems = listOfficeDocuments({
      type: type || null,
      period: period || null,
      tag: tag || null,
      isPublic,
    });
    const items = allItems.slice(offset, offset + limit).map((item) => ({
      ...item,
      downloadUrl: `/api/office/documents/${item.id}/download`,
    }));
    const nextCursor = getNextCursor(allItems.length, offset, limit);

    return ok(request, { items, total: allItems.length, limit, nextCursor });
  } catch (error) {
    return serverError(request, "Ошибка загрузки документов", error);
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/docs",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    return forbidden(request);
  }
  if (!can(role === "admin" ? "chairman" : role, "documents.manage")) {
    return forbidden(request);
  }

  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return badRequest(request, "Некорректные данные");
    }

    const title = String(formData.get("title") ?? "").trim();
    const type = String(formData.get("type") ?? "other") as OfficeDocumentType;
    const period = String(formData.get("period") ?? "").trim();
    const tagsRaw = String(formData.get("tags") ?? "");
    const isPublic = String(formData.get("isPublic") ?? "false") === "true";
    const file = formData.get("file");

    if (!title) {
      return badRequest(request, "Название обязательно");
    }
    if (!file || !(file instanceof File)) {
      return badRequest(request, "Файл обязателен");
    }

    const uploaded = await uploadOfficeDocumentFile(file);
    const tags = tagsRaw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const record = createOfficeDocument({
      title,
      type,
      period: period || null,
      tags,
      isPublic,
      fileName: uploaded.fileName,
      fileUrl: uploaded.fileUrl,
      uploadedBy: session.id ?? null,
    });

    return ok(request, { record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка загрузки";
    if (message === "UPLOAD_NOT_CONFIGURED") {
      return badRequest(request, "Нет настроенного хранилища файлов");
    }
    return serverError(request, "Ошибка загрузки документа", error);
  }
}
