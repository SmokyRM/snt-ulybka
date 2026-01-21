import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { detectIssues, filterIssues, type DataIssueType } from "@/lib/registry/core/issues.store";
import { forbidden, unauthorized, serverError } from "@/lib/api/respond";

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return unauthorized(request, "Unauthorized");
    }

    const role = user.role;
    if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
      return forbidden(request, "Forbidden");
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const severityParam = searchParams.get("severity");

    const { issues } = detectIssues();

    const filtered = filterIssues(issues, {
      type: typeParam ? (typeParam as DataIssueType) : undefined,
      severity: severityParam
        ? (severityParam as "low" | "medium" | "high")
        : undefined,
    });

    // Build CSV
    const headers = [
      "ID проблемы",
      "Тип проблемы",
      "Важность",
      "Описание",
      "ID человека",
      "ФИО",
      "Телефон",
      "Email",
      "Связанные ID",
    ];

    const rows = filtered.map((issue) => [
      issue.id,
      issue.type,
      issue.severity,
      issue.description,
      issue.personId,
      issue.person.fullName || "",
      issue.person.phone || "",
      issue.person.email || "",
      issue.relatedPersonIds?.join("; ") || "",
    ]);

    const csvLines = [
      headers.map(escapeCsvValue).join(","),
      ...rows.map((row) => row.map(escapeCsvValue).join(",")),
    ];

    const csv = csvLines.join("\n");
    const filename = `registry-issues-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
