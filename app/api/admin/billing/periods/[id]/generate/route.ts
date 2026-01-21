import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { ok, unauthorized, forbidden, badRequest, fail } from "@/lib/api/respond";
import {
  findUnifiedBillingPeriodById,
  listPlots,
  ensurePeriodAccrual,
  updatePeriodAccrual,
  listPeriodAccruals,
  listFeeTariffs,
  getEffectiveTariffAmount,
} from "@/lib/mockDb";
import type { PeriodAccrual } from "@/types/snt";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    return forbidden(request);
  }

  const { id } = await params;
  const period = findUnifiedBillingPeriodById(id);
  if (!period) {
    return fail(request, "not_found", "period not found", 404);
  }

  if (period.status !== "draft") {
    return badRequest(request, "can only generate accruals for draft periods");
  }

  const body = await request.json().catch(() => ({}));
  const { types } = body;
  const accrualTypes: Array<"membership" | "target" | "electric"> = Array.isArray(types)
    ? types.filter((t: string) => ["membership", "target", "electric"].includes(t))
    : ["membership", "target", "electric"];

  const plots = listPlots().filter((p) => p.status !== "archived");
  const existingAccruals = listPeriodAccruals(period.id);
  const existingByKey = new Map<string, PeriodAccrual>();
  existingAccruals.forEach((a) => {
    existingByKey.set(`${a.plotId}:${a.type}`, a);
  });

  // Get active tariffs for the period date (use middle of period)
  const periodDate = new Date(period.from);
  const midPeriodDate = new Date((new Date(period.from).getTime() + new Date(period.to).getTime()) / 2);
  const activeTariffs = listFeeTariffs({ activeAt: midPeriodDate.toISOString().split("T")[0] });

  const membershipTariff = activeTariffs.find((t) => t.type === "member");
  const targetTariff = activeTariffs.find((t) => t.type === "target");

  const generated: Array<{ plotId: string; type: string; amount: number }> = [];
  const skipped: Array<{ plotId: string; type: string; reason: string }> = [];

  plots.forEach((plot) => {
    if (accrualTypes.includes("membership")) {
      const key = `${plot.id}:membership`;
      if (existingByKey.has(key)) {
        skipped.push({ plotId: plot.id, type: "membership", reason: "already exists" });
      } else {
        if (!membershipTariff) {
          skipped.push({ plotId: plot.id, type: "membership", reason: "no active tariff" });
        } else {
          // Get plot area (use plot.area or default to 6 соток)
          const plotArea = plot.area ?? 6;
          const amount = getEffectiveTariffAmount(membershipTariff.id, plot.id, plotArea);
          if (amount === null) {
            skipped.push({ plotId: plot.id, type: "membership", reason: "cannot calculate amount" });
          } else {
            const accrual = ensurePeriodAccrual(period.id, plot.id, "membership");
            updatePeriodAccrual(accrual.id, { amountAccrued: amount });
            generated.push({ plotId: plot.id, type: "membership", amount });
          }
        }
      }
    }

    if (accrualTypes.includes("target")) {
      const key = `${plot.id}:target`;
      if (existingByKey.has(key)) {
        skipped.push({ plotId: plot.id, type: "target", reason: "already exists" });
      } else {
        if (!targetTariff) {
          skipped.push({ plotId: plot.id, type: "target", reason: "no active tariff" });
        } else {
          const plotArea = plot.area ?? 6;
          const amount = getEffectiveTariffAmount(targetTariff.id, plot.id, plotArea);
          if (amount === null || amount === 0) {
            skipped.push({ plotId: plot.id, type: "target", reason: "cannot calculate amount or zero" });
          } else {
            const accrual = ensurePeriodAccrual(period.id, plot.id, "target");
            updatePeriodAccrual(accrual.id, { amountAccrued: amount });
            generated.push({ plotId: plot.id, type: "target", amount });
          }
        }
      }
    }

    // Note: electric accruals require meter readings, so we skip them here
    // They should be generated separately via electricity-specific logic
  });

  await logAdminAction({
    action: "generate_period_accruals",
    entity: "billing_period",
    entityId: period.id,
    after: {
      generated: generated.length,
      skipped: skipped.length,
      types: accrualTypes,
    },
    headers: request.headers,
  });

  return ok(request, {
    success: true,
    generated: generated.length,
    skipped: skipped.length,
    details: { generated, skipped },
  });
}
