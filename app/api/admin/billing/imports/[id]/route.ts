import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { getPaymentImportJob, listImportRowErrors } from "@/lib/billing";
import { ok, unauthorized, fail, serverError } from "@/lib/api/respond";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const job = getPaymentImportJob(id);
    if (!job) {
      return fail(request, "not_found", "Import job not found", 404);
    }

    const errors = listImportRowErrors(id);

    // Check if CSV export requested
    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    if (format === "csv" && errors.length > 0) {
      // Generate CSV for errors
      const headers = Object.keys(errors[0]?.rowData || {}).join(";");
      const rows = errors.map((err) => {
        const values = Object.values(err.rowData || {}).map((v) => {
          const str = String(v ?? "");
          // Escape quotes and wrap in quotes if contains delimiter or newline
          if (str.includes(";") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        return `${err.rowIndex};${err.type};${err.reason};${values.join(";")}`;
      });

      const csv = `Row Index;Error Type;Reason;${headers}\n${rows.join("\n")}`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="import-errors-${id}.csv"`,
        },
      });
    }

    return ok(request, { job, errors });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}