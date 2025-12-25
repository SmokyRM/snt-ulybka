import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { listPlotsWithFilters } from "@/lib/mockDb";

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
  const { items } = listPlotsWithFilters({
    query: filters.query,
    street: filters.street,
    membershipStatus: membership,
    archived: filters.archived,
    page: 1,
    pageSize: 1000,
  });

  const header = ["street", "number", "membershipStatus", "status", "ownerName", "phone", "email", "updatedAt"];
  const rows = items.map((p) =>
    [
      p.street,
      p.plotNumber,
      p.membershipStatus ?? "",
      p.status ?? "active",
      p.ownerFullName ?? "",
      p.phone ?? "",
      p.email ?? "",
      p.updatedAt,
    ]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="registry.csv"',
    },
  });
}
