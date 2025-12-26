import { NextResponse } from "next/server";
import { getCollectionsAnalytics, withTotals } from "@/lib/analytics";
import { listExpenses } from "@/lib/mockDb";

export async function GET(request: Request) {
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
    return {
      ...p,
      spent: spentMonth,
      balance: paidAll - spentMonth,
    };
  });
  const totalsWithExpenses = {
    ...totals,
    spent,
    balance: totals.all.paid - spent,
  };
  return NextResponse.json({ ok: true, months, totals: totalsWithExpenses });
}
