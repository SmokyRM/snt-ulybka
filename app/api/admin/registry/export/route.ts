import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { listPlotsWithFilters, listPersons } from "@/lib/mockDb";
import { formatAdminTime } from "@/lib/settings.shared";
import { membershipLabel } from "@/lib/membershipLabels";

const parseFilters = (request: Request) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  const street = url.searchParams.get("street");
  const membershipStatus = url.searchParams.get("membershipStatus");
  const archivedParam = url.searchParams.get("archived");
  const archived =
    archivedParam === null ? null : archivedParam === "1" || archivedParam === "true" ? true : false;
  return { query, street, membershipStatus, archived };
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const filters = parseFilters(request);
  const membership =
    filters.membershipStatus && filters.membershipStatus.toUpperCase
      ? (filters.membershipStatus.toUpperCase() as
          | "MEMBER"
          | "NON_MEMBER"
          | "PENDING"
          | "UNKNOWN")
      : null;
  const persons = listPersons();
  const { items } = listPlotsWithFilters({
    query: filters.query,
    street: filters.street,
    membershipStatus: membership,
    archived: filters.archived,
    page: 1,
    pageSize: 1000,
  });

  const BOM = "\uFEFF";
  const header = [
    "Улица",
    "Участок",
    "Статус членства",
    "Архив",
    "Владелец",
    "Телефон",
    "Email",
    "Обновлено",
  ];

  const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = items.map((p) => {
    const ownerIds = persons.filter((person) => person.fullName === p.ownerFullName);
    const phones = [p.phone, ...ownerIds.map((o) => o.phone)].filter(Boolean).join(", ");
    const emails = [p.email, ...ownerIds.map((o) => o.email)].filter(Boolean).join(", ");
    return [
      p.street,
      p.plotNumber,
      membershipLabel[(p.membershipStatus ?? "UNKNOWN") as keyof typeof membershipLabel] ?? "",
      p.status === "archived" ? "Да" : "Нет",
      p.ownerFullName ?? "",
      phones,
      emails,
      formatAdminTime(p.updatedAt),
    ]
      .map(escapeCsv)
      .join(";");
  });

  const filename = `registry_export_${formatAdminTime(new Date().toISOString())
    .replace(/\s+/g, "_")
    .replace(/[:]/g, "-")}.csv`;

  const csv = BOM + [header.map(escapeCsv).join(";"), ...rows].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
