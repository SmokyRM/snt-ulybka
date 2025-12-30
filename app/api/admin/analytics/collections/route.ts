import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getCollectionsAnalytics, withTotals } from "@/lib/analytics";
import { logAdminAction } from "@/lib/audit";
import { listExpenses } from "@/lib/mockDb";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const { points, totals } = withTotals(getCollectionsAnalytics({ from, to }).points);
  const expenses = listExpenses({ from, to });
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const months = points.map((p) => {
    const spentMonth = expenses
      .filter((e) => (e.date ?? "").startsWith(p.period))
      .reduce((sum, e) => sum + e.amount, 0);
    const paidAll = p.membership.paid + p.target.paid + p.electricity.paid;
    return { ...p, spent: spentMonth, balance: paidAll - spentMonth };
  });
  const totalsWithExpenses = {
    ...totals,
    spent,
    balance: totals.all.paid - spent,
  };

  await logAdminAction({
    action: "view_analytics_collections",
    entity: "analytics",
    after: { from, to, points: months.length },
  });

  return NextResponse.json({ ok: true, months, totals: totalsWithExpenses });
}
