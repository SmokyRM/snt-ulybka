import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listPlotsWithFilters } from "@/lib/mockDb";
import { forbidden, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasAdminAccess(user)) {
      return forbidden(request, "forbidden");
    }
    const { items } = listPlotsWithFilters({ page: 1, pageSize: 10000 });
    const headers = ["plot_display", "cadastral_number", "owner", "phone", "note"];
    const lines = items.map((p) => {
      const display = `Улица ${p.street}, участок ${p.plotNumber}`;
      return [
        display,
        p.cadastral || "",
        p.ownerFullName || "",
        p.phone || "",
        p.notes || "",
      ]
        .map((val) => `"${(val || "").toString().replace(/"/g, '""')}"`)
        .join(";");
    });
    const content = `\uFEFF${headers.join(";")}\r\n${lines.join("\r\n")}\r\n`;
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="registry_export.csv"',
      },
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
