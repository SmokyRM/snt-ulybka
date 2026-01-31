import { ok, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { listDebts } from "@/lib/billing.store";

export async function GET(request: Request) {
  const guard = await requirePermission(request, "billing.receipts", {
    route: "/api/office/billing/receipts/batch.zip",
    deniedReason: "billing.receipts",
  });
  if (guard instanceof Response) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
    const minDebt = Number(searchParams.get("minDebt") ?? "0");
    const plotIdsParam = searchParams.get("plotIds");
    const plotIds = plotIdsParam ? plotIdsParam.split(",") : null;

    let debts = listDebts().filter((d) => d.debt >= minDebt);
    if (plotIds && plotIds.length > 0) {
      debts = debts.filter((d) => plotIds.includes(d.key));
    }

    const links = debts.map((debt) => {
      const params = new URLSearchParams();
      params.set("period", period);
      params.set("minDebt", String(minDebt));
      params.set("plotIds", debt.key);
      return {
        plotId: debt.key,
        plotLabel: debt.plotId,
        residentName: debt.residentName,
        url: `/api/office/billing/receipts/pdf?${params.toString()}`,
      };
    });

    return ok(request, {
      mode: "json",
      period,
      count: links.length,
      links,
      message: "ZIP генерация не включена, возвращён список ссылок на квитанции.",
    });
  } catch (error) {
    return serverError(request, "Ошибка генерации пакета квитанций", error);
  }
}
