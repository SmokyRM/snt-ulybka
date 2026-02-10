export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { badRequest, forbidden, unauthorized } from "@/lib/api/respond";
import { buildResidentBillingSummary } from "@/lib/cabinet/billing.server";
import { isResidentRole } from "@/lib/rbac";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { createSimplePdf } from "@/lib/simplePdf";
import { createOfficeDocument } from "@/lib/office/documentsRegistry.store";
import { uploadOfficeDocumentFile } from "@/lib/office/documentUpload.server";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

function buildReceiptLines(params: {
  period: string;
  plotLabel: string;
  residentName: string;
  debt: number;
}) {
  return [
    `Квитанция на оплату за ${params.period}`,
    "",
    `Участок: ${params.plotLabel}`,
    `Владелец: ${params.residentName}`,
    `К оплате: ${formatCurrency(params.debt)}`,
    "",
    "Оплату можно произвести по реквизитам СНТ или наличными в кассу.",
  ];
}

export async function GET(request: Request, { params }: { params: { period: string } }) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) {
    return unauthorized(request);
  }
  if (!isResidentRole(session.role)) {
    return forbidden(request);
  }

  const period = params.period;
  if (!period) {
    return badRequest(request, "Не указан период");
  }

  const summary = buildResidentBillingSummary(session.id);
  const selected = summary.periods.find((item) => item.period === period);
  if (!selected) {
    return badRequest(request, "Квитанция за этот период недоступна");
  }

  const lines = buildReceiptLines({
    period,
    plotLabel: summary.plotLabel ?? "—",
    residentName: session.fullName ?? "Житель",
    debt: selected.debt,
  });
  const pdf = createSimplePdf([lines]);
  const filename = `receipt-${period}.pdf`;
  const uploaded = await uploadOfficeDocumentFile(
    new File([new Uint8Array(pdf)], filename, { type: "application/pdf" }),
  );
  const doc = createOfficeDocument({
    title: `Квитанция ${period}`,
    type: "monthly_report",
    period,
    tags: ["receipt"],
    isPublic: false,
    accessScope: "resident",
    plotId: summary.plotId ?? null,
    personId: session.id,
    versionKey: `receipt:${session.id}:${summary.plotId ?? "unknown"}:${period}`,
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
