import { NextResponse } from "next/server";
import { getSessionUser, hasBillingAccess } from "@/lib/session.server";
import {
  findBillingImportByBatch,
  findImportBatch,
  updateImportBatch,
  updateBillingImport,
  voidPaymentsByBatch,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

type ParamsPromise<T> = { params: Promise<T> };

export async function POST(_req: Request, { params }: ParamsPromise<{ id: string }>) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  if (!hasBillingAccess(user)) return NextResponse.json({ error: "Нет доступа к отмене импорта" }, { status: 403 });

  const { id } = await params;
  const batch = findImportBatch(id);
  if (!batch) return NextResponse.json({ error: "Импорт не найден" }, { status: 404 });
  if (batch.status === "rolled_back") {
    return NextResponse.json({ ok: true, voided: 0, status: "already_rolled_back", message: "Импорт уже отменён" });
  }

  try {
    // Soft rollback: помечаем платежи как voided (не удаляем)
    const voided = voidPaymentsByBatch(id, "rollback import", user.id ?? null);
    updateImportBatch(id, { status: "rolled_back", rollbackAt: new Date().toISOString() });
    const billingImport = findBillingImportByBatch(id);
    if (billingImport) {
      updateBillingImport(billingImport.id, {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      });
    }

    await logAdminAction({
      action: "rollback_import_batch",
      entity: "import_batch",
      entityId: id,
      before: null,
      after: { voided },
    });

    return NextResponse.json({ ok: true, voided, message: `Отменено платежей: ${voided}` });
  } catch (error) {
    console.error("[billing-import-rollback] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Внутренняя ошибка при отмене импорта" },
      { status: 500 }
    );
  }
}
