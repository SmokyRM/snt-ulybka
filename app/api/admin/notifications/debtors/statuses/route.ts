import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { listDebtNotifications } from "@/lib/mockDb";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasFinanceAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const periodId = url.searchParams.get("periodId");
  const type = url.searchParams.get("type") as "membership" | "electricity" | null;
  if (!periodId || !type) {
    return NextResponse.json({ error: "periodId and type are required" }, { status: 400 });
  }
  const notifications = listDebtNotifications({ periodId, type });
  return NextResponse.json({
    items: notifications.map((n) => ({
      plotId: n.plotId,
      status: n.status,
      comment: n.comment ?? null,
      updatedAt: n.updatedAt,
    })),
  });
}
