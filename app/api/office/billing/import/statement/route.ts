import { Buffer } from "buffer";
import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { createOfficeJob } from "@/lib/office/jobs.store";
import { enqueueOfficeJob } from "@/lib/office/jobs.server";
import { logAdminAction } from "@/lib/audit";
import { getRequestId } from "@/lib/api/requestId";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.import_statement", {
    route: "/api/office/billing/import/statement",
    deniedReason: "billing.import_statement",
  });
  if (guard instanceof Response) return guard;
  const session = guard.session;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let fileName: string | null = null;
    let base64 = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (file instanceof Blob) {
        const buffer = await file.arrayBuffer();
        base64 = Buffer.from(buffer).toString("base64");
        fileName = "name" in file ? (file as File).name : null;
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      if (typeof body.base64 === "string") base64 = body.base64;
      if (typeof body.fileName === "string") fileName = body.fileName;
    }

    if (!base64) {
      return fail(request, "validation_error", "Файл выписки не загружен", 400);
    }

    const job = await createOfficeJob({
      type: "billing.importStatement",
      payload: { base64, fileName },
      createdBy: session?.id ?? null,
      requestId: getRequestId(request),
    });
    enqueueOfficeJob(job.id);

    await logAdminAction({
      action: "statement.import.start",
      entity: "billing.importStatement",
      entityId: job.id,
      route: "/api/office/billing/import/statement",
      success: true,
      meta: { fileName },
      headers: request.headers,
    });

    return ok(request, { jobId: job.id });
  } catch (error) {
    return serverError(request, "Ошибка импорта выписки", error);
  }
}
