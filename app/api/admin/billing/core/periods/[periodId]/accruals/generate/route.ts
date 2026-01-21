import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { getPeriod, updatePeriod } from "@/lib/billing/core";
import { listTariffs } from "@/lib/billing/core/tariffs.store";
import { createAccrual, listAccruals } from "@/lib/billing/core/accruals.store";
import { listPlots } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { ok, unauthorized, badRequest, fail, serverError } from "@/lib/api/respond";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const { periodId } = await params;
    const period = getPeriod(periodId);
    if (!period) {
      return fail(request, "not_found", "Period not found", 404);
    }

    // If period is closed, open it first
    if (period.status === "closed") {
      updatePeriod(periodId, { status: "open" });
    }

    // Get active tariffs
    const activeTariffs = listTariffs({ active: true });
    if (activeTariffs.length === 0) {
      return badRequest(request, "No active tariffs found");
    }

    // Get all plots
    const plots = listPlots();
    if (plots.length === 0) {
      return badRequest(request, "No plots found");
    }

    // Get existing accruals for this period
    const existingAccruals = listAccruals({ periodId });
    const existingKeys = new Set(
      existingAccruals.map((a) => `${a.periodId}:${a.plotId}:${a.tariffId}`)
    );

    // Create accruals
    let created = 0;
    const errors: string[] = [];

    for (const plot of plots) {
      for (const tariff of activeTariffs) {
        // Check if already exists
        const key = `${periodId}:${plot.id}:${tariff.id}`;
        if (existingKeys.has(key)) {
          continue;
        }

        try {
          // Accrual amount = tariff.amount per plot (ignore area for now)
          const amount = tariff.amount;
          createAccrual({
            periodId,
            plotId: plot.id,
            tariffId: tariff.id,
            amount,
            status: "pending",
          });
          created++;
        } catch (error) {
          errors.push(
            `Failed to create accrual for plot ${plot.id}, tariff ${tariff.id}: ${error instanceof Error ? error.message : "unknown error"}`
          );
        }
      }
    }

    await logAdminAction({
      action: "accruals_generated",
      entity: "period",
      entityId: periodId,
      after: { periodId, created, errors: errors.length },
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, { ok: true, count: created, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
