import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { getElectricityReport, findPlotById } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api/respond";

const toCsvValue = (value: string | number) => {
  const str = typeof value === "number" ? value.toString() : value;
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request);
  }

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(url.searchParams.get("month") ?? new Date().getMonth() + 1);
  const plotNumber = url.searchParams.get("plotNumber");
  const onlyDebtors = url.searchParams.get("onlyDebtors") === "true";

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return badRequest(request, "Неверный период");
  }

  try {
    let items = getElectricityReport(year, month);

    // Enrich with owner name
    items = items.map((item) => {
      const plot = findPlotById(item.plotId);
      return {
        ...item,
        ownerFullName: plot?.ownerFullName || null,
      };
    });

    // Apply filters
    if (plotNumber) {
      items = items.filter((item) => item.number.includes(plotNumber));
    }
    if (onlyDebtors) {
      items = items.filter((item) => item.debt > 0.01);
    }

    const header = [
      "Улица",
      "Участок",
      "Владелец",
      "Δ кВт",
      "Начислено",
      "Оплачено",
      "Долг",
    ];
    const rows = items.map((i) =>
      [
        toCsvValue(i.street),
        toCsvValue(i.number),
        toCsvValue((i as { ownerFullName?: string | null }).ownerFullName || ""),
        toCsvValue(i.deltaKwh ?? 0),
        toCsvValue(i.amountAccrued ?? 0),
        toCsvValue(i.amountPaid ?? 0),
        toCsvValue(i.debt ?? 0),
      ].join(";")
    );
    const content = ["\uFEFF" + header.map(toCsvValue).join(";"), ...rows].join("\r\n");
    const res = new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="electricity_report_${year}-${month.toString().padStart(2, "0")}.csv"`,
      },
    });
    await logAdminAction({
      action: "export_electricity_report",
      entity: "electricity_report",
      after: { year, month, count: items.length },
    });
    return res;
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
