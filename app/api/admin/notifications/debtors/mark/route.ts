import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { upsertDebtNotification } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const plotId = (body.plotId as string | undefined)?.trim();
  const periodId = (body.periodId as string | undefined)?.trim();
  const type = body.type as "membership" | "electricity" | undefined;
  const status = body.status as "new" | "notified" | "resolved" | undefined;
  const debtAmount = Number(body.debtAmount);
  const comment = (body.comment as string | undefined) ?? null;
  if (!plotId || !periodId || !type || !status || !Number.isFinite(debtAmount)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const saved = upsertDebtNotification({
    plotId,
    periodId,
    type,
    debtAmount,
    status,
    comment,
    createdByUserId: user.id ?? null,
  });

  await logAdminAction({
    action: status === "resolved" ? "resolve_debt_notification" : "mark_debt_notified",
    entity: "debt_notification",
    entityId: saved.id,
    after: saved,
  });

  return NextResponse.json({ notification: saved });
}
