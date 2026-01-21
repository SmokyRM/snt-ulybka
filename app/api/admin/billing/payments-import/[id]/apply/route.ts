import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";
import {
  findPaymentImportById,
  listPaymentImportRows,
  updatePaymentImport,
  updatePaymentImportRow,
  listPayments,
  addPayment,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import crypto from "crypto";

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
    const accessCheck = await checkAdminOrOfficeAccess(request);
    if (!accessCheck.allowed) {
      return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
    }

    const user = await getSessionUser();
    if (!user) {
      return unauthorized(request);
    }

    const { id } = await params;
    const import_ = findPaymentImportById(id);
    if (!import_) {
      return fail(request, "not_found", "import not found", 404);
    }

    if (import_.status !== "draft") {
      return badRequest(request, "import already applied or cancelled");
    }

  const rows = listPaymentImportRows(id);
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

    // Create payment
    const payment = addPayment({
      periodId: null, // Will be allocated later if needed
      plotId: row.matchedPlotId || null,
      amount: row.amount,
      paidAt: `${row.date}T12:00:00Z`,
      method: "import",
      reference: row.externalId || null,
      comment: row.purpose || null,
      createdByUserId: user.id ?? null,
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
    appliedByUserId: user.id ?? null,
  });

    await logAdminAction({
      action: "apply_payment_import",
      entity: "payment_import",
      entityId: id,
      after: {
        appliedRows: appliedCount,
        errors: errors.length,
      },
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
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
