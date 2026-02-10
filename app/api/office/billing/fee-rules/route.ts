export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { logAdminAction } from "@/lib/audit";
import {
  listFeeRules,
  upsertFeeRule,
  deleteFeeRule,
  type FeeRuleAppliesTo,
  type FeeRuleCalcType,
} from "@/lib/billing/feeRules.pg";

const isAppliesTo = (value: unknown): value is FeeRuleAppliesTo =>
  value === "all" || value === "street" || value === "plot" || value === "tag";

const isCalcType = (value: unknown): value is FeeRuleCalcType =>
  value === "flat" || value === "per_area" || value === "per_kwh" || value === "custom";

export async function GET(request: Request) {
  const guard = await requirePermission(request, "billing.generate", { route: "/api/office/billing/fee-rules" });
  if (guard instanceof Response) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    const activeOnly = searchParams.get("active") === "true";
    const rules = await listFeeRules({ activeOnly, period });
    return ok(request, { rules });
  } catch (error) {
    return serverError(request, "Ошибка загрузки правил начислений", error);
  }
}

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.generate", { route: "/api/office/billing/fee-rules" });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : null;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const periodFrom = typeof body.periodFrom === "string" ? body.periodFrom : null;
    const periodTo = typeof body.periodTo === "string" ? body.periodTo : null;
    const appliesTo = isAppliesTo(body.appliesTo) ? body.appliesTo : "all";
    const selector = typeof body.selector === "object" && body.selector ? body.selector : {};
    const calcType = isCalcType(body.calcType) ? body.calcType : "flat";
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount ?? 0);
    const meta = typeof body.meta === "object" && body.meta ? body.meta : {};
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
    const remove = Boolean(body.remove);

    if (!name) {
      return fail(request, "validation_error", "Название правила обязательно", 400);
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return fail(request, "validation_error", "Сумма должна быть числом >= 0", 400);
    }

    if (remove) {
      if (!id) return fail(request, "validation_error", "id обязателен для удаления", 400);
      const deleted = await deleteFeeRule(id);
      await logAdminAction({
        action: "fee_rules.delete",
        entity: "billing.fee_rules",
        entityId: id,
        route: "/api/office/billing/fee-rules",
        success: true,
        meta: { id },
        headers: request.headers,
      });
      return ok(request, { deleted });
    }

    const rule = await upsertFeeRule({
      id,
      name,
      periodFrom,
      periodTo,
      appliesTo,
      selector,
      calcType,
      amount,
      meta,
      createdBy: guard.session.id ?? null,
      isActive,
    });

    await logAdminAction({
      action: id ? "fee_rules.update" : "fee_rules.create",
      entity: "billing.fee_rules",
      entityId: rule?.id ?? null,
      route: "/api/office/billing/fee-rules",
      success: true,
      meta: { id: rule?.id ?? null, name },
      headers: request.headers,
    });

    return ok(request, { rule });
  } catch (error) {
    return serverError(request, "Ошибка сохранения правила начислений", error);
  }
}
