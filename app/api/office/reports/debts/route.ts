export const runtime = "nodejs";

import { ok, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { buildDebtReportPg, hasPgConnection } from "@/lib/office/reporting.pg";

export async function GET(request: Request) {
  const guard = await requirePermission(request, "billing.view_debtors", {
    route: "/api/office/reports/debts",
  });
  if (guard instanceof Response) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    const street = searchParams.get("street");
    const minDebt = searchParams.get("minDebt");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    if (!hasPgConnection()) {
      return ok(request, { items: [], limit: 0, offset: 0 });
    }

    const report = await buildDebtReportPg({
      period: period || null,
      street: street || null,
      minDebt: minDebt ? Number(minDebt) : null,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    return ok(request, report);
  } catch (error) {
    return serverError(request, "Ошибка формирования отчёта", error);
  }
}
