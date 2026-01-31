import { requirePermission } from "@/lib/permissionsGuard";
import { ok, badRequest, fail, serverError } from "@/lib/api/respond";
import {
  findPaymentImportById,
  listPaymentImportRows,
  updatePaymentImport,
  updatePaymentImportRow,
  listPayments,
  addPayment,
  listUnifiedBillingPeriods,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import crypto from "crypto";
import { findPeriodForDate } from "@/lib/billing/unifiedReconciliation.server";

// Create stable hash for row deduplication
function createRowHash(row: {
  date: string;
  amount: number;
  externalId?: string | null;
}): string {
  const key = JSON.stringify({
    date: row.date,
    amount: row.amount,
    externalId: row.externalId || null,
  });
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission(request, "billing.import", {
      route: "/api/admin/billing/payments-import/[id]/apply",
      deniedReason: "billing.import",
    });
    if (guard instanceof Response) return guard;
    const { session } = guard;
    if (!session) return fail(request, "unauthorized", "Unauthorized", 401);

    const { id } = await params;
    const import_ = findPaymentImportById(id);
    if (!import_) {
      return fail(request, "not_found", "import not found", 404);
    }

    if (import_.status !== "draft") {
      return badRequest(request, "import already applied or cancelled");
    }

  const rows = listPaymentImportRows(id);
  const periods = listUnifiedBillingPeriods();
  const validRows = rows.filter((r) => !r.validationErrors || r.validationErrors.length === 0);
  const existingPayments = listPayments({});

  // Track duplicates
  const seenExternalIds = new Set<string>();
  const seenHashes = new Set<string>();

  let appliedCount = 0;
  const errors: Array<{ rowId: string; reason: string }> = [];

  for (const row of validRows) {
    // Skip if already has payment (idempotency)
    if (row.paymentId) {
      appliedCount++;
      continue;
    }

    // Check for duplicate externalId (stored in reference field)
    if (row.externalId) {
      const existingByExternalId = existingPayments.find((p) => p.reference === row.externalId);
      if (existingByExternalId) {
        errors.push({ rowId: row.id, reason: `Дубликат по externalId: ${row.externalId}` });
        continue;
      }
      if (seenExternalIds.has(row.externalId)) {
        errors.push({ rowId: row.id, reason: `Дубликат в файле по externalId: ${row.externalId}` });
        continue;
      }
      seenExternalIds.add(row.externalId);
    }

    // Check for duplicate by hash
    const rowHash = createRowHash({
      date: row.date,
      amount: row.amount,
      externalId: row.externalId,
    });
    if (seenHashes.has(rowHash)) {
      errors.push({ rowId: row.id, reason: "Дубликат строки в файле" });
      continue;
    }
    seenHashes.add(rowHash);

    const existingByHash = existingPayments.find((p) => {
      // Use fingerprint if available, otherwise compare by date+amount+reference
      if (p.fingerprint) {
        return p.fingerprint === rowHash;
      }
      // Fallback: compare by date, amount, and reference
      const pDate = p.paidAt.split("T")[0];
      if (pDate !== row.date || p.amount !== row.amount) return false;
      if (row.externalId && p.reference !== row.externalId) return false;
      if (!row.externalId && p.reference) return false;
      return true;
    });
    if (existingByHash) {
      errors.push({ rowId: row.id, reason: "Дубликат платежа (уже существует в системе)" });
      continue;
    }

    const matchedPeriod = row.date ? findPeriodForDate(row.date, periods) : null;
    if (matchedPeriod?.status === "closed") {
      errors.push({ rowId: row.id, reason: "Период закрыт. Импорт запрещён." });
      continue;
    }

    // Create payment
    const payment = addPayment({
      periodId: matchedPeriod?.id ?? null,
      plotId: row.matchedPlotId || null,
      amount: row.amount,
      paidAt: `${row.date}T12:00:00Z`,
      method: "import",
      reference: row.externalId || null,
      comment: row.purpose || null,
      createdByUserId: session.id ?? null,
      category: null, // Will be determined during allocation
      fingerprint: rowHash,
    });

    // Update row with payment ID
    updatePaymentImportRow(row.id, {
      paymentId: payment.id,
    });

    appliedCount++;
  }

  // Update import status
  updatePaymentImport(id, {
    status: "applied",
    appliedRows: appliedCount,
    appliedAt: new Date().toISOString(),
    appliedByUserId: session.id ?? null,
  });

    await logAdminAction({
      action: "apply_payment_import",
      entity: "payment_import",
      entityId: id,
      after: {
        appliedRows: appliedCount,
        errors: errors.length,
      },
      meta: { actorUserId: session.id ?? null, actorRole: session.role ?? null },
      headers: request.headers,
    });

    return ok(request, {
      success: true,
      applied: appliedCount,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
