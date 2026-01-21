import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { listPlots } from "@/lib/mockDb";
import { getPlotBalance } from "@/lib/billing/services";
import { ok, unauthorized, badRequest, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return badRequest(request, "Bad request");
    }

    const plotIds = Array.isArray(body.plotIds) ? body.plotIds.filter((id: unknown) => typeof id === "string") : [];

    if (plotIds.length === 0) {
      return ok(request, { plots: [] });
    }

  const plots = listPlots();
  const enriched = plotIds
    .map((plotId: string) => {
      const plot = plots.find((p) => p.id === plotId);
      if (!plot) return null;

      const balance = getPlotBalance(plotId);
      const periods = balance.breakdown
        .map((b) => {
          return `${b.periodId.slice(0, 10)}: ${b.amount.toFixed(2)} ₽`;
        })
        .join(", ");

      return {
        id: plot.id,
        street: plot.street || "",
        plotNumber: plot.plotNumber || "",
        ownerName: plot.ownerFullName || undefined,
        debtAmount: balance.totalDebt.toFixed(2),
        periods: periods || "Нет периодов",
      };
    })
    .filter((p: typeof enriched[0] | null): p is NonNullable<typeof p> => p !== null);

    return ok(request, { plots: enriched });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}