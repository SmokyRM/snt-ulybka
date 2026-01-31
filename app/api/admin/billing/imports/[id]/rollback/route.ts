import { requirePermission } from "@/lib/permissionsGuard";
import {
  findBillingImportByBatch,
  findImportBatch,
  updateImportBatch,
  updateBillingImport,
  voidPaymentsByBatch,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { ok, fail, serverError } from "@/lib/api/respond";

type ParamsPromise<T> = { params: Promise<T> };

export async function POST(request: Request, { params }: ParamsPromise<{ id: string }>) {
  try {
    const guard = await requirePermission(request, "billing.import", {
      route: "/api/admin/billing/imports/[id]/rollback",
      deniedReason: "billing.import",
    });
    if (guard instanceof Response) return guard;
    const { session } = guard;
    if (!session) return fail(request, "unauthorized", "Unauthorized", 401);

    const { id } = await params;
    const batch = findImportBatch(id);
    if (!batch) return fail(request, "not_found", "Импорт не найден", 404);
    if (batch.status === "rolled_back") {
      return ok(request, { voided: 0, status: "already_rolled_back", message: "Импорт уже отменён" });
    }

    // Soft rollback: помечаем платежи как voided (не удаляем)
    const voided = voidPaymentsByBatch(id, "rollback import", session.id ?? null);
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

    return ok(request, { voided, message: `Отменено платежей: ${voided}` });
  } catch (error) {
    return serverError(request, "Внутренняя ошибка при отмене импорта", error);
  }
}
