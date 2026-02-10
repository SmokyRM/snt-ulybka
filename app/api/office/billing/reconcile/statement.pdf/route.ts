export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissionsGuard";
import { buildReconciliationStatementPg, hasPgConnection } from "@/lib/billing/reconciliationStatement.pg";
import { createSimplePdf } from "@/lib/simplePdf";
import { uploadOfficeDocumentFile } from "@/lib/office/documentUpload.server";
import { createOfficeDocument } from "@/lib/office/documentsRegistry.store";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: Request) {
  const guard = await requirePermission(request, "billing.reconcile", {
    route: "/api/office/billing/reconcile/statement.pdf",
  });
  if (guard instanceof Response) return guard;

  const { searchParams } = new URL(request.url);
  const plotId = searchParams.get("plotId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!plotId || !from || !to) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  if (!hasPgConnection()) {
    return new NextResponse("PG not configured", { status: 503 });
  }

  const statement = await buildReconciliationStatementPg({ plotId, from, to });
  const lines: string[] = [];
  lines.push(`Акт сверки: ${statement.plotLabel}`);
  lines.push(`Период: ${from} — ${to}`);
  lines.push("");
  lines.push(`Начислено: ${statement.totals.accrued}`);
  lines.push(`Оплачено: ${statement.totals.paid}`);
  lines.push(`Долг: ${statement.totals.debt}`);
  lines.push(`Переплата: ${statement.totals.overpay}`);
  lines.push("");
  lines.push("Операции:");
  statement.operations.slice(0, 50).forEach((op) => {
    lines.push(`${op.date} · ${op.type} · ${op.amount}`);
  });

  const pdf = createSimplePdf([lines]);
  const filename = `reconciliation-${plotId}-${from}-${to}.pdf`.replace(/[^a-zA-Z0-9-_\\.]/g, "_");
  const file = new File([new Uint8Array(pdf)], filename, { type: "application/pdf" });
  const uploaded = await uploadOfficeDocumentFile(file);
  const doc = createOfficeDocument({
    title: `Акт сверки ${statement.plotLabel} ${from}–${to}`,
    type: "reconciliation_statement",
    period: `${from}-${to}`,
    tags: ["reconciliation"],
    isPublic: false,
    fileName: uploaded.fileName,
    fileUrl: uploaded.fileUrl,
    uploadedBy: guard.session.id ?? null,
  });

  await logAdminAction({
    action: "reconcile.statement.pdf",
    entity: "billing.reconcile",
    entityId: plotId,
    route: "/api/office/billing/reconcile/statement.pdf",
    success: true,
    meta: { plotId, from, to, docId: doc.id },
    headers: request.headers,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "x-office-doc-id": doc.id,
      "x-office-doc-url": uploaded.fileUrl,
    },
  });
}
