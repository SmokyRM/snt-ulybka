import { getSessionUser } from "@/lib/session.server";
import { getElectricityReport, findPlotById } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
  }
  
  await getSessionUser();

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(url.searchParams.get("month") ?? new Date().getMonth() + 1);
  const plotNumber = url.searchParams.get("plotNumber");
  const onlyDebtors = url.searchParams.get("onlyDebtors") === "true";

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return badRequest(request, "Неверный период");
  }

  try {
    let report = getElectricityReport(year, month);

    // Enrich with owner name
    report = report.map((item) => {
      const plot = findPlotById(item.plotId);
      return {
        ...item,
        ownerFullName: plot?.ownerFullName || null,
      };
    });

    // Apply filters
    if (plotNumber) {
      report = report.filter((item) => item.number.includes(plotNumber));
    }
    if (onlyDebtors) {
      report = report.filter((item) => item.debt > 0.01);
    }

    await logAdminAction({
      action: "view_electricity_report",
      entity: "electricity_report",
      after: { year, month, count: report.length, filters: { plotNumber, onlyDebtors } },
      headers: request.headers,
    });
    return ok(request, { items: report });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
