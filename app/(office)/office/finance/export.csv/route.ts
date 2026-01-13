import { NextResponse } from "next/server";
import { listFinance } from "@/lib/finance.store";
import { can, type Role } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session.server";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/office/finance", request.url));
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!can(role === "admin" ? "chairman" : role, "office.finance.manage")) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const debtorsOnly = url.searchParams.get("debtors") === "1";
  const rows = listFinance({ q, debtorsOnly });

  const header = ["Участок", "Владелец", "Начислено", "Оплачено", "Баланс", "Обновлено"];
  const lines = rows.map((row) =>
    [
      row.plotNumber,
      row.ownerName ?? "",
      row.accrued.toString(),
      row.paid.toString(),
      row.balance.toString(),
      new Date(row.updatedAt).toISOString(),
    ].join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"finance-export.csv\"",
    },
  });
}
