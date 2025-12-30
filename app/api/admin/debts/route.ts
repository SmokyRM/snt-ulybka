import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { logAdminAction } from "@/lib/audit";
import { getDebtsData, DebtTypeFilter } from "@/lib/debts";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasFinanceAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const period = url.searchParams.get("period");
  const type = (url.searchParams.get("type") as DebtTypeFilter | null) ?? "all";
  const minDebt = url.searchParams.get("minDebt");
  const q = url.searchParams.get("q");
  const onlyUnnotified = url.searchParams.get("onlyUnnotified") === "1";

  const { items, totals, error } = getDebtsData({
    period,
    type,
    minDebt: minDebt ? Number(minDebt) : null,
    q,
    onlyUnnotified,
  });
  if (error) return NextResponse.json({ error }, { status: 400 });

  await logAdminAction({
    action: "view_debts_dashboard",
    entity: "debts",
    after: { period, type, count: items.length },
  });

  return NextResponse.json({ ok: true, items, totals });
}
