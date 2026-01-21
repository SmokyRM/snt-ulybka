import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";
import {
  findUnifiedBillingPeriodById,
  listPlots,
  listFeeTariffs,
  getEffectiveTariffAmount,
} from "@/lib/mockDb";

type PreviewRow = {
  plotId: string;
  plotNumber: string;
  ownerName: string;
  membershipAmount: number;
  targetAmount: number;
  total: number;
};

type SkippedItem = {
  plotId?: string;
  plotNumber?: string;
  reason: string;
};

/** Dry-run: что будет сгенерировано. Не пишет в store. Admin + office. */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const body = await request.json().catch(() => ({}));
    const periodId = typeof body.periodId === "string" ? body.periodId : null;

    if (!periodId) {
      return badRequest(request, "periodId required");
    }

  const period = findUnifiedBillingPeriodById(periodId);
  if (!period) return fail(request, "not_found", "Период не найден", 404);

  const plots = listPlots().filter((p) => p.status !== "archived");
  if (plots.length === 0) {
    return ok(request, {
      rows: [],
      skipped: [{ reason: "нет участков в реестре" }],
    });
  }

  const mid =
    period.from && period.to
      ? new Date((new Date(period.from).getTime() + new Date(period.to).getTime()) / 2)
          .toISOString()
          .slice(0, 10)
      : period.from.slice(0, 7) + "-15";

  const activeTariffs = listFeeTariffs({ activeAt: mid }).filter((t) => t.status !== "draft");
  const membershipTariff = activeTariffs.find((t) => t.type === "member");
  const targetTariff = activeTariffs.find((t) => t.type === "target");

  const rows: PreviewRow[] = [];
  const skipped: SkippedItem[] = [];

  if (!membershipTariff && !targetTariff) {
    skipped.push({ reason: "нет активного тарифа (membership или target) на дату периода" });
  }

  for (const plot of plots) {
    const plotArea = plot.area ?? null;
    const ownerName = plot.ownerFullName ?? "—";

    let mem = 0;
    let tgt = 0;

    if (membershipTariff) {
      const v = getEffectiveTariffAmount(membershipTariff.id, plot.id, plotArea);
      if (v === null) {
        skipped.push({ plotId: plot.id, plotNumber: plot.plotNumber ?? plot.id, reason: "membership: нельзя рассчитать (нет area для per_sotka или тариф)" });
      } else {
        mem = v;
      }
    }

    if (targetTariff) {
      const v = getEffectiveTariffAmount(targetTariff.id, plot.id, plotArea);
      if (v === null) {
        skipped.push({ plotId: plot.id, plotNumber: plot.plotNumber ?? plot.id, reason: "target: нельзя рассчитать" });
      } else {
        tgt = v;
      }
    }

    // если оба нули и при этом нет тарифов — не добавляем в rows
    if (mem > 0 || tgt > 0 || membershipTariff || targetTariff) {
      rows.push({
        plotId: plot.id,
        plotNumber: plot.plotNumber ?? plot.id,
        ownerName,
        membershipAmount: mem,
        targetAmount: tgt,
        total: mem + tgt,
      });
    }
  }

    return ok(request, { rows, skipped });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
