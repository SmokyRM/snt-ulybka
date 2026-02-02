import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { createOfficeJob } from "@/lib/office/jobs.store";
import { enqueueOfficeJob } from "@/lib/office/jobs.server";
import { logAdminAction } from "@/lib/audit";
import { getRequestId } from "@/lib/api/requestId";
import { parseCsv, extractPeriodsFromRows } from "@/lib/billing/import-helpers";
import { assertPeriodsOpenOrReason } from "@/lib/office/periodClose.store";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.import", {
    route: "/api/office/billing/import-payments",
    deniedReason: "billing.import",
  });
  if (guard instanceof Response) return guard;
  const session = guard.session;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let csvContent = "";
    let mode: string | null = null;
    let reason: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (file instanceof Blob) {
        csvContent = await file.text();
      }
      mode = (formData.get("mode") as string | null) ?? null;
      reason = (formData.get("reason") as string | null) ?? null;
    } else if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      if (typeof body.csv === "string") csvContent = body.csv;
      if (typeof body.text === "string") csvContent = body.text;
      if (typeof body.mode === "string") mode = body.mode;
      if (typeof body.reason === "string") reason = body.reason;
    } else {
      csvContent = await request.text();
    }

    csvContent = csvContent.replace(/^\uFEFF/, "").trim();
    if (!csvContent) {
      return fail(request, "validation_error", "CSV файл пуст", 400);
    }

    let closeCheck: { closed: false; periods: string[] } | { closed: true; periods: string[]; reason: string };
    try {
      const rows = parseCsv(csvContent);
      const periods = extractPeriodsFromRows(rows);
      closeCheck = assertPeriodsOpenOrReason(periods, reason);
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }

    const job = await createOfficeJob({
      type: "payments.import.csv",
      payload: { csvContent, mode },
      createdBy: session?.id ?? null,
      requestId: getRequestId(request),
    });
    enqueueOfficeJob(job.id);

    await logAdminAction({
      action: "job.start",
      entity: "payments.import.csv",
      entityId: job.id,
      route: "/api/office/billing/import-payments",
      success: true,
      meta: closeCheck.closed
        ? { mode, postCloseChange: true, reason: closeCheck.reason, periods: closeCheck.periods }
        : { mode },
      headers: request.headers,
    });

    return ok(request, { jobId: job.id });
  } catch (error) {
    return serverError(request, "Ошибка обработки CSV", error);
  }
}
