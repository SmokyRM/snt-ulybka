export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { unauthorized, forbidden } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isResidentRole } from "@/lib/rbac";
import { buildResidentBillingSummary } from "@/lib/cabinet/billing.server";
import { createSimplePdf } from "@/lib/simplePdf";
import { createOfficeDocument } from "@/lib/office/documentsRegistry.store";
import { uploadOfficeDocumentFile } from "@/lib/office/documentUpload.server";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) {
    return unauthorized(request);
  }
  if (!isResidentRole(session.role)) {
    return forbidden(request);
  }

  const summary = buildResidentBillingSummary(session.id);
  const generatedAt = new Date().toISOString().slice(0, 10);
  const noDebt = summary.totalDebt <= 0;
  const lines = [
    "Справка по расчетам с СНТ",
    "",
    `Дата: ${generatedAt}`,
    `Владелец: ${session.fullName ?? "Житель"}`,
    `Участок: ${summary.plotLabel ?? "—"}`,
    "",
    noDebt ? "Задолженность отсутствует." : `Есть задолженность: ${formatCurrency(summary.totalDebt)}`,
    `Всего начислено: ${formatCurrency(summary.totalAccrued)}`,
    `Всего оплачено: ${formatCurrency(summary.totalPaid)}`,
  ];

  const pdf = createSimplePdf([lines]);
  const filename = `no-debt-certificate-${generatedAt}.pdf`;
  const uploaded = await uploadOfficeDocumentFile(new File([new Uint8Array(pdf)], filename, { type: "application/pdf" }));
  const doc = createOfficeDocument({
    title: "Справка по расчетам",
    type: "other",
    period: generatedAt.slice(0, 7),
    tags: ["certificate", "no_debt"],
    isPublic: false,
    accessScope: "resident",
    plotId: summary.plotId ?? null,
    personId: session.id,
    versionKey: `certificate:${session.id}:${summary.plotId ?? "unknown"}:${generatedAt.slice(0, 7)}`,
    fileName: uploaded.fileName,
    fileUrl: uploaded.fileUrl,
    uploadedBy: session.id,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "x-office-doc-id": doc.id,
    },
  });
}
