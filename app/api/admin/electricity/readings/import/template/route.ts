import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { listAllMeters, findPlotById } from "@/lib/mockDb";
import { forbidden, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request);
  }

  try {
    const meters = listAllMeters().filter((m) => m.active);
    const rows = meters.map((meter) => {
      const plot = findPlotById(meter.plotId);
      return {
        plotId: meter.plotId,
        street: plot?.street || "",
        plotNumber: plot?.plotNumber || "",
        meterNumber: meter.meterNumber || "",
        readingDate: new Date().toISOString().split("T")[0],
        value: "",
      };
    });

    const header = ["plotId", "street", "plotNumber", "meterNumber", "readingDate", "value"];
    const separator = ";";
    const csvRows = [
      header.join(separator),
      ...rows.map((row) => header.map((h) => `"${String(row[h as keyof typeof row] || "").replace(/"/g, '""')}"`).join(separator)),
    ];

    const csv = "\uFEFF" + csvRows.join("\r\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="electricity-readings-template-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
