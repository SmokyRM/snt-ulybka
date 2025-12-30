import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listPlots } from "@/lib/plotsDb";
import { membershipLabel } from "@/lib/membershipLabels";
import type { MembershipStatus } from "@/types/snt";

const toCsvValue = (value: string | number) => {
  const str = typeof value === "number" ? value.toString() : value;
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

const parseFilters = (params: URLSearchParams) => {
  const confirmedParam = params.get("confirmed");
  const membershipParam = params.get("membership");
  const q = params.get("q") ?? undefined;
  const missingContacts = params.get("missingContacts") === "1";
  return {
    confirmed: confirmedParam === "1" ? true : confirmedParam === "0" ? false : undefined,
    membership:
      membershipParam === "UNKNOWN" || membershipParam === "MEMBER" || membershipParam === "NON_MEMBER"
        ? (membershipParam as MembershipStatus)
        : undefined,
    q,
    missingContacts,
  };
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const filters = parseFilters(url.searchParams);
  const plots = listPlots(filters);

  const header = ["Улица", "Участок", "ФИО", "Контакты", "Членство", "Подтверждён"];
  const rows = plots.map((p) => {
    const contact = p.phone || p.email || "—";
    return [
      toCsvValue(p.street),
      toCsvValue(p.plotNumber),
      toCsvValue(p.ownerFullName ?? "—"),
      toCsvValue(contact),
      toCsvValue(membershipLabel(p.membershipStatus)),
      toCsvValue(p.isConfirmed ? "Да" : "Нет"),
    ].join(";");
  });

  const content = ["\uFEFF" + header.map(toCsvValue).join(";"), ...rows].join("\r\n");
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plots_export.csv"`,
    },
  });
}
