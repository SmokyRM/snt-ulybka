import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { getPeriod } from "@/lib/billing/core";
import { listAccruals } from "@/lib/billing/core/accruals.store";
import { listPayments, listPaymentAllocations } from "@/lib/billing/core/payments.store";
import { listTariffs } from "@/lib/billing/core/tariffs.store";
import { listPlots } from "@/lib/mockDb";
import { ok, unauthorized, fail, serverError } from "@/lib/api/respond";

export async function GET(
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

    const accruals = listAccruals({ periodId });
    const tariffs = listTariffs({ active: true });
    const plots = listPlots();
    const payments = listPayments();
    const allocations = listPaymentAllocations();

    // Calculate totals
    const totalAccrued = accruals.reduce((sum, a) => sum + a.amount, 0);
    const accrualIds = new Set(accruals.map((a) => a.id));
    const totalPaid = allocations
      .filter((a) => accrualIds.has(a.accrualId))
      .reduce((sum, a) => sum + a.amount, 0);
    const totalDebt = totalAccrued - totalPaid;

    // Enrich accruals with plot and tariff info
    const enriched = accruals.map((accrual) => {
      const plot = plots.find((p) => p.id === accrual.plotId);
      const tariff = tariffs.find((t) => t.id === accrual.tariffId);
      return {
        id: accrual.id,
        plotId: accrual.plotId,
        street: plot?.street ?? "",
        plotNumber: plot?.plotNumber ?? "",
        ownerName: plot?.ownerFullName ?? "",
        tariffId: accrual.tariffId,
        tariffName: tariff?.name ?? "Неизвестный тариф",
        amount: accrual.amount,
      };
    });

    // Check if CSV export requested
    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    if (format === "csv") {
      const headers = ["Улица", "Участок", "Владелец", "Тариф", "Сумма, ₽"];
      const rows = enriched.map((accrual) => {
        const values = [
          accrual.street,
          accrual.plotNumber,
          accrual.ownerName,
          accrual.tariffName,
          accrual.amount.toFixed(2),
        ];
        return values.map((v) => {
          const str = String(v ?? "");
          if (str.includes(";") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(";");
      });

      const csv = `${headers.join(";")}\n${rows.join("\n")}`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="accruals-${period.year}-${String(period.month).padStart(2, "0")}.csv"`,
        },
      });
    }

    return ok(request, {
      accruals: enriched,
      totals: { accrued: totalAccrued, paid: totalPaid, debt: totalDebt },
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
