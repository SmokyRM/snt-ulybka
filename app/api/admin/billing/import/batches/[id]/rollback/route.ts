import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { findImportBatch, voidPaymentsByBatch, updateImportBatch } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

type ParamsPromise<T> = { params: Promise<T> };

export async function POST(request: Request, { params }: ParamsPromise<{ id: string }>) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const batch = findImportBatch(id);
  if (!batch) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (batch.status === "rolled_back") {
    return NextResponse.json({ error: "already rolled back" }, { status: 400 });
  }

  const reasonBody = await request.json().catch(() => ({}));
  const reason = typeof reasonBody.reason === "string" ? reasonBody.reason : "Rollback import";

  const voided = voidPaymentsByBatch(id, reason, user.id ?? null);
  updateImportBatch(id, { status: "rolled_back", rollbackAt: new Date().toISOString() });

  await logAdminAction({
    action: "rollback_import_batch",
    entity: "payment_batch",
    entityId: id,
    after: { voided },
    comment: reason,
  });

  return NextResponse.json({ ok: true, voided });
}

