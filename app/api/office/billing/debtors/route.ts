import { ok, badRequest, serverError } from "@/lib/api/respond";
import { listDebtorSegments } from "@/lib/office/debtors";
import { requirePermission } from "@/lib/permissionsGuard";

export async function GET(request: Request) {
  const guard = await requirePermission(request, "billing.view_debtors", {
    route: "/api/office/billing/debtors",
    deniedReason: "billing.view_debtors",
  });
  if (guard instanceof Response) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const segment = searchParams.get("segment");
    const minDebtParam = searchParams.get("minDebt");
    const hasPhoneParam = searchParams.get("hasPhone");
    const hasTelegramParam = searchParams.get("hasTelegram");
    const street = searchParams.get("street")?.trim().toLowerCase();
    const q = searchParams.get("q")?.trim().toLowerCase();

    const minDebt = minDebtParam ? Number(minDebtParam) : null;
    if (minDebtParam && Number.isNaN(minDebt)) {
      return badRequest(request, "Некорректное значение minDebt");
    }

    let rows = listDebtorSegments();

    if (segment) {
      rows = rows.filter((row) => row.segment === segment);
    }
    if (typeof minDebt === "number") {
      rows = rows.filter((row) => row.totalDebt >= minDebt);
    }
    if (hasPhoneParam === "1") {
      rows = rows.filter((row) => row.hasPhone);
    }
    if (hasTelegramParam === "1") {
      rows = rows.filter((row) => row.hasTelegram);
    }
    if (street) {
      rows = rows.filter((row) => row.plotLabel.toLowerCase().includes(street));
    }
    if (q) {
      rows = rows.filter(
        (row) => `${row.plotLabel} ${row.residentName}`.toLowerCase().includes(q)
      );
    }

    rows = rows.sort((a, b) => b.totalDebt - a.totalDebt);
    return ok(request, { items: rows, count: rows.length });
  } catch (error) {
    return serverError(request, "Ошибка загрузки должников", error);
  }
}
