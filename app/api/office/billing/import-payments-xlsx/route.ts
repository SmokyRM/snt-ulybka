import { Buffer } from "buffer";
import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { createOfficeJob } from "@/lib/office/jobs.store";
import { enqueueOfficeJob } from "@/lib/office/jobs.server";
import { logAdminAction } from "@/lib/audit";
import { getRequestId } from "@/lib/api/requestId";
import { parseXlsx } from "@/lib/excel";
import { extractPeriodsFromRows } from "@/lib/billing/import-helpers";
import { assertPeriodsOpenOrReason } from "@/lib/office/periodClose.store";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.import.excel", {
    route: "/api/office/billing/import-payments-xlsx",
    deniedReason: "billing.import.excel",
  });
  if (guard instanceof Response) return guard;
  const session = guard.session;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return fail(request, "validation_error", "Файл обязателен", 400);
    }
    const mode = (formData.get("mode") as string | null) ?? null;
    const reason = (formData.get("reason") as string | null) ?? null;

    const buffer = new Uint8Array(await file.arrayBuffer());
    const base64 = Buffer.from(buffer).toString("base64");

    let closeCheck: { closed: false; periods: string[] } | { closed: true; periods: string[]; reason: string };
    try {
      const rows = await parseXlsx(buffer);
      const periods = extractPeriodsFromRows(rows);
      closeCheck = assertPeriodsOpenOrReason(periods, reason);
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }

    const job = await createOfficeJob({
      type: "payments.import.xlsx",
      payload: { base64, mode },
      createdBy: session?.id ?? null,
      requestId: getRequestId(request),
    });
    enqueueOfficeJob(job.id);

    await logAdminAction({
      action: "job.start",
      entity: "payments.import.xlsx",
      entityId: job.id,
      route: "/api/office/billing/import-payments-xlsx",
      success: true,
      meta: closeCheck.closed
        ? { mode, postCloseChange: true, reason: closeCheck.reason, periods: closeCheck.periods }
        : { mode },
      headers: request.headers,
    });

    return ok(request, { jobId: job.id });
  } catch (error) {
    return serverError(request, "Ошибка обработки XLSX", error);
  }
}
