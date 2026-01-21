import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { ok, unauthorized, forbidden, badRequest, fail } from "@/lib/api/respond";
import {
  findDebtNotificationTemplateById,
  createDebtNotificationHistory,
  findPlotById,
} from "@/lib/mockDb";
import { findUnifiedBillingPeriodById } from "@/lib/mockDb";

function replacePlaceholders(
  template: string,
  data: {
    ownerName: string;
    plotNumber: string;
    street: string;
    debtTotal: number;
    debtMembership: number;
    debtTarget: number;
    debtElectric: number;
    periodFrom: string;
    periodTo: string;
  }
): string {
  return template
    .replace(/\{\{ownerName\}\}/g, data.ownerName || "Собственник")
    .replace(/\{\{plotNumber\}\}/g, data.plotNumber)
    .replace(/\{\{street\}\}/g, data.street)
    .replace(/\{\{debtTotal\}\}/g, data.debtTotal.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/\{\{debtMembership\}\}/g, data.debtMembership.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/\{\{debtTarget\}\}/g, data.debtTarget.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/\{\{debtElectric\}\}/g, data.debtElectric.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/\{\{periodFrom\}\}/g, data.periodFrom)
    .replace(/\{\{periodTo\}\}/g, data.periodTo);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    return forbidden(request);
  }

  const body = await request.json().catch(() => ({}));
  const { plotIds, templateId, periodId, saveHistory } = body;

  if (!Array.isArray(plotIds) || plotIds.length === 0) {
    return badRequest(request, "plotIds array is required");
  }

  if (!templateId) {
    return badRequest(request, "templateId is required");
  }

  const template = findDebtNotificationTemplateById(templateId);
  if (!template) {
    return fail(request, "not_found", "template not found", 404);
  }

  // Get debt data for each plot (simplified - would need to fetch from debts API)
  // For now, we'll use a simplified approach and require the client to send debt data
  const { debtData } = body; // Array of { plotId, debtMembership, debtTarget, debtElectric, debtTotal }

  if (!Array.isArray(debtData)) {
    return badRequest(request, "debtData array is required");
  }

  const period = periodId ? findUnifiedBillingPeriodById(periodId) : null;

  const generated: Array<{
    plotId: string;
    plotNumber: string;
    street: string;
    ownerName: string;
    generatedText: string;
    historyId?: string;
  }> = [];

  for (const plotId of plotIds) {
    const plot = findPlotById(plotId);
    if (!plot) continue;

    const debt = debtData.find((d: { plotId: string }) => d.plotId === plotId);
    if (!debt) continue;

    const text = replacePlaceholders(template.body, {
      ownerName: plot.ownerFullName || "Собственник",
      plotNumber: plot.plotNumber,
      street: plot.street,
      debtTotal: debt.debtTotal || 0,
      debtMembership: debt.debtMembership || 0,
      debtTarget: debt.debtTarget || 0,
      debtElectric: debt.debtElectric || 0,
      periodFrom: period?.from || "",
      periodTo: period?.to || "",
    });

    let historyId: string | undefined;
    if (saveHistory) {
      const history = createDebtNotificationHistory({
        plotId,
        periodId: periodId || null,
        templateId,
        generatedText: text,
        status: "draft",
        createdByUserId: user.id ?? null,
      });
      historyId = history.id;
    }

    generated.push({
      plotId,
      plotNumber: plot.plotNumber,
      street: plot.street,
      ownerName: plot.ownerFullName || "Собственник",
      generatedText: text,
      historyId,
    });
  }

  return ok(request, { generated });
}
