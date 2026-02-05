export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { createSimplePdf } from "@/lib/simplePdf";
import { buildMonthlyReport } from "@/lib/office/reporting";
import { getMonthlyReport, hasPgConnection } from "@/lib/office/reporting.pg";
import { uploadOfficeDocumentFile } from "@/lib/office/documentUpload.server";
import { createOfficeDocument } from "@/lib/office/documentsRegistry.store";
import { isEnabled } from "@/lib/config/flags";

export async function GET(request: Request) {
  if (!isEnabled("pdf_generation")) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "feature_disabled",
          message: "PDF генерация отключена флагом FEATURE_PDF_GENERATION",
        },
      },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session || !isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/reports/monthly.pdf",
      role: session?.role ?? null,
      userId: session?.id ?? null,
      status: session ? 403 : 401,
      latencyMs: Date.now() - startedAt,
      error: session ? "FORBIDDEN" : "UNAUTHORIZED",
    });
    return new NextResponse("Forbidden", { status: session ? 403 : 401 });
  }

  if (!(role === "admin" || role === "chairman" || role === "accountant" || hasPermission(role, "billing.export"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const report = hasPgConnection() ? await getMonthlyReport(period) : buildMonthlyReport(period);
  const lines: string[] = [];
  lines.push(`Ежемесячный отчёт за ${report.period}`);
  lines.push("");

  if ("counts" in report) {
    // New format from getMonthlyReport (PG)
    lines.push("=== ИТОГИ ===");
    lines.push(`Начислено: ${report.totals.accrued}`);
    lines.push(`Оплачено: ${report.totals.paid}`);
    lines.push(`Распределено: ${report.totals.allocated}`);
    lines.push(`Всего долг: ${report.totals.debtTotal}`);
    lines.push(`Всего переплата: ${report.totals.overpayTotal}`);
    lines.push("");
    lines.push("=== КОЛИЧЕСТВО ===");
    lines.push(`Должников: ${report.counts.debtors}`);
    lines.push(`Переплативших: ${report.counts.overpayers}`);
    lines.push(`Платежей: ${report.counts.payments}`);
    lines.push(`Участков с начислениями: ${report.counts.plots}`);
    lines.push("");
    lines.push("=== ТОП ДОЛЖНИКОВ ===");
    if (report.topDebtors.length === 0) {
      lines.push("- нет");
    } else {
      report.topDebtors.forEach((debtor: { plotId: string; label: string; debt: number }) => {
        lines.push(`- ${debtor.label}: ${debtor.debt}`);
      });
    }
    lines.push("");
    lines.push("=== КАЧЕСТВО ДАННЫХ ===");
    lines.push(`Нераспределенных платежей: ${report.dataQuality.unallocatedPayments}`);
    lines.push(`Несопоставленных платежей: ${report.dataQuality.unmatchedPayments}`);
    lines.push(`Неоднозначных платежей: ${report.dataQuality.ambiguousPayments}`);
  } else if ("categories" in report) {
    // Old in-memory format
    lines.push(`Начислено: ${report.totals.accrued}`);
    lines.push(`Оплачено: ${report.totals.paid}`);
    lines.push(`Долг: ${report.totals.debt}`);
    lines.push(`Пени: ${report.totals.penalty}`);
    lines.push("");
    lines.push("Категории:");
    if (report.categories.length === 0) {
      lines.push("- нет");
    } else {
      report.categories.forEach((cat) => {
        lines.push(`- ${cat.label}: ${cat.amount}`);
      });
    }
    lines.push("");
    lines.push("Обращения:");
    lines.push(`Всего: ${report.appeals.total}`);
    lines.push(`Новые: ${report.appeals.new}`);
    lines.push(`В работе: ${report.appeals.inProgress}`);
    lines.push(`Закрытые: ${report.appeals.closed}`);
  }

  const pdf = createSimplePdf([lines]);
  const filename = `monthly-report-${report.period}.pdf`;
  const file = new File([new Uint8Array(pdf)], filename, { type: "application/pdf" });
  const uploaded = await uploadOfficeDocumentFile(file);
  const doc = createOfficeDocument({
    title: `Ежемесячный отчёт ${report.period}`,
    type: "monthly_report",
    period: report.period,
    tags: ["monthly_report"],
    isPublic: false,
    accessScope: "office",
    versionKey: `monthly-report:${report.period}`,
    fileName: uploaded.fileName,
    fileUrl: uploaded.fileUrl,
    uploadedBy: session.id ?? null,
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
