export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { logAuditEvent } from "@/lib/auditLog.pg";
import { getRequestId } from "@/lib/api/requestId";
import { parseCsv } from "@/lib/billing/import-helpers";
import { importDryRun } from "@/lib/billing/import-dryrun";
import { hasPgConnection } from "@/lib/billing/payments.pg";

/**
 * Dry-run endpoint for payment import.
 * POST /api/office/billing/import-payments/preview
 *
 * Accepts CSV as multipart/form-data or application/json with { csv: string }
 * Returns preview of what will be created, skipped, and errors.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const guard = await requirePermission(request, "billing.import", {
    route: "/api/office/billing/import-payments/preview",
    deniedReason: "billing.import",
  });
  if (guard instanceof Response) return guard;
  const session = guard.session;

  if (!hasPgConnection()) {
    return fail(request, "no_pg", "Предпросмотр доступен только с PostgreSQL", 501);
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let csvContent = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (file instanceof Blob) {
        csvContent = await file.text();
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      if (typeof body.csv === "string") csvContent = body.csv;
      if (typeof body.text === "string") csvContent = body.text;
    } else {
      csvContent = await request.text();
    }

    csvContent = csvContent.replace(/^\uFEFF/, "").trim();
    if (!csvContent) {
      return fail(request, "validation_error", "CSV файл пуст", 400);
    }

    const rows = parseCsv(csvContent);
    const result = await importDryRun(rows);

    // Audit log (dry-run attempt)
    await logAuditEvent({
      actorUserId: session?.id ?? null,
      actorRole: session?.role ?? null,
      action: "import_payments_dryrun",
      entityType: "billing_payments",
      route: "/api/office/billing/import-payments/preview",
      success: true,
      requestId,
      meta: {
        totalRows: result.summary.total,
        willCreate: result.summary.willCreate,
        willSkip: result.summary.willSkip,
        errors: result.summary.errors,
      },
    });

    return ok(request, {
      dryRun: true,
      summary: result.summary,
      rows: result.rows.slice(0, 100), // Limit response size
      errors: result.errors.slice(0, 50),
      hasMoreRows: result.rows.length > 100,
      hasMoreErrors: result.errors.length > 50,
    });
  } catch (error) {
    return serverError(request, "Ошибка при предпросмотре импорта", error);
  }
}
