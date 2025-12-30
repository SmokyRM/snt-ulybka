import { NextResponse } from "next/server";
import { getSessionUser, hasImportAccess } from "@/lib/session.server";
import {
  findImportBatch,
  updateImportBatch,
  voidPaymentsByBatch,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

type ParamsPromise<T> = { params: Promise<T> };

export async function POST(_req: Request, { params }: ParamsPromise<{ id: string }>) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasImportAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const batch = findImportBatch(id);
  if (!batch) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (batch.status === "rolled_back") {
    return NextResponse.json({ ok: true, voided: 0, status: "already_rolled_back" });
  }

  const voided = voidPaymentsByBatch(id, "rollback import", user.id ?? null);
  updateImportBatch(id, { status: "rolled_back", rollbackAt: new Date().toISOString() });

  await logAdminAction({
    action: "rollback_import_batch",
    entity: "import_batch",
    entityId: id,
    before: null,
    after: { voided },
  });

  return NextResponse.json({ ok: true, voided });
}
