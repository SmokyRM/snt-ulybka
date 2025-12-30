import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { logAdminAction } from "@/lib/audit";
import { getAccrualDebtors } from "./utils";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasFinanceAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const typeParam = (url.searchParams.get("type") as "membership" | "electricity" | null) ?? "membership";
  const periodRaw = url.searchParams.get("period");

  const { items, periodLabel, error } = getAccrualDebtors(typeParam, periodRaw);
  if (error) return NextResponse.json({ error }, { status: 400 });

  await logAdminAction({
    action: "generate_debt_notifications",
    entity: "debt_notifications",
    after: { type: typeParam, period: periodLabel, count: items.length },
  });

  return NextResponse.json({ items });
}
