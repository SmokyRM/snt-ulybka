import { getSessionUser } from "@/lib/session.server";
import { listFeeTariffs, createFeeTariff, updateFeeTariff } from "@/lib/billing";
import { logAdminAction } from "@/lib/audit";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import { ok, unauthorized, forbidden, badRequest, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const accessCheck = await checkAdminOrOfficeAccess(request);
    if (!accessCheck.allowed) {
      return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
    }

    const user = await getSessionUser();
    const tariffs = listFeeTariffs();
    return ok(request, { tariffs });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function POST(request: Request) {
  try {
    const accessCheck = await checkAdminOrOfficeAccess(request);
    if (!accessCheck.allowed) {
      return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
    }

    const user = await getSessionUser();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return badRequest(request, "Bad request");
    }

    const type = typeof body.type === "string" ? body.type.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const amount = Number(body.amount);
    const appliesTo = body.appliesTo === "area" ? "area" : "plot";
    const activeFrom = typeof body.activeFrom === "string" ? body.activeFrom.trim() : "";
    const activeTo = typeof body.activeTo === "string" && body.activeTo.trim() ? body.activeTo.trim() : null;
    const status = body.status === "inactive" ? "inactive" : "active";
    const overrideOverlap = Boolean(body.overrideOverlap);

    // Validation
    if (!type || !title) {
      return badRequest(request, "Тип и название обязательны");
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      return badRequest(request, "Сумма должна быть больше 0 и не превышать 1 000 000");
    }
    if (!activeFrom || Number.isNaN(new Date(activeFrom).getTime())) {
      return badRequest(request, "Некорректная дата начала действия");
    }
    if (activeTo && Number.isNaN(new Date(activeTo).getTime())) {
      return badRequest(request, "Некорректная дата окончания действия");
    }

    const activeFromDate = new Date(activeFrom);
    const activeToDate = activeTo ? new Date(activeTo) : null;

    // Check for overlapping tariffs of same type (if overrideOverlap is false)
    if (!overrideOverlap && status === "active") {
      const existingTariffs = listFeeTariffs({ type, status: "active" });
      const hasOverlap = existingTariffs.some((t) => {
        const tFrom = new Date(t.activeFrom).getTime();
        const tTo = t.activeTo ? new Date(t.activeTo).getTime() : Infinity;
        const newFrom = activeFromDate.getTime();
        const newTo = activeToDate ? activeToDate.getTime() : Infinity;

        // Check if date ranges overlap
        return (newFrom >= tFrom && newFrom <= tTo) || (newTo >= tFrom && newTo <= tTo) || (newFrom <= tFrom && newTo >= tTo);
      });

      if (hasOverlap) {
        return badRequest(request, "Пересекающиеся активные тарифы запрещены", { overlap: true });
      }
    }

    const created = createFeeTariff({
      type,
      title,
      amount,
      appliesTo,
      activeFrom: activeFromDate.toISOString(),
      activeTo: activeToDate ? activeToDate.toISOString() : null,
      status,
    });

    await logAdminAction({
      action: "fee_tariff_created",
      entity: "fee_tariff",
      entityId: created.id,
      after: created,
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, { tariff: created }, { status: 201 });
  } catch (error) {
    return serverError(request, error instanceof Error ? error.message : "Ошибка создания тарифа", error);
  }
}

export async function PUT(request: Request) {
  try {
    const accessCheck = await checkAdminOrOfficeAccess(request);
    if (!accessCheck.allowed) {
      return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
    }

    const user = await getSessionUser();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || typeof body.id !== "string") {
      return badRequest(request, "Bad request");
    }

    const id = body.id.trim();
    const type = typeof body.type === "string" ? body.type.trim() : undefined;
    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const amount = typeof body.amount === "number" ? body.amount : undefined;
    const appliesTo = body.appliesTo === "area" ? "area" : body.appliesTo === "plot" ? "plot" : undefined;
    const activeFrom = typeof body.activeFrom === "string" ? body.activeFrom.trim() : undefined;
    const activeTo = body.activeTo === null || body.activeTo === undefined ? undefined : typeof body.activeTo === "string" && body.activeTo.trim() ? body.activeTo.trim() : null;
    const status = body.status === "inactive" ? "inactive" : body.status === "active" ? "active" : undefined;
    const overrideOverlap = Boolean(body.overrideOverlap);

    const existingTariff = listFeeTariffs().find((t) => t.id === id);
    if (!existingTariff) {
      return badRequest(request, "Тариф не найден");
    }

    // Build updates object
    const updates: Partial<{
      type: string;
      title: string;
      amount: number;
      appliesTo: "plot" | "area";
      activeFrom: string;
      activeTo: string | null;
      status: "active" | "inactive";
    }> = {};

    if (type !== undefined) updates.type = type;
    if (title !== undefined) updates.title = title;
    if (amount !== undefined) {
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
        return badRequest(request, "Сумма должна быть больше 0 и не превышать 1 000 000");
      }
      updates.amount = amount;
    }
    if (appliesTo !== undefined) updates.appliesTo = appliesTo;
    if (activeFrom !== undefined) {
      if (Number.isNaN(new Date(activeFrom).getTime())) {
        return badRequest(request, "Некорректная дата начала действия");
      }
      updates.activeFrom = new Date(activeFrom).toISOString();
    }
    if (activeTo !== undefined) {
      if (activeTo !== null && Number.isNaN(new Date(activeTo).getTime())) {
        return badRequest(request, "Некорректная дата окончания действия");
      }
      updates.activeTo = activeTo ? new Date(activeTo).toISOString() : null;
    }
    if (status !== undefined) updates.status = status;

    // Check for overlapping tariffs if status is being set to active or dates are changed
    const finalStatus = updates.status ?? existingTariff.status;
    const finalType = updates.type ?? existingTariff.type;
    const finalActiveFrom = updates.activeFrom ? new Date(updates.activeFrom) : new Date(existingTariff.activeFrom);
    const finalActiveTo = updates.activeTo !== undefined ? (updates.activeTo ? new Date(updates.activeTo) : null) : (existingTariff.activeTo ? new Date(existingTariff.activeTo) : null);

    if (!overrideOverlap && finalStatus === "active" && (updates.status || updates.activeFrom || updates.activeTo !== undefined)) {
      const existingTariffs = listFeeTariffs({ type: finalType, status: "active" }).filter((t) => t.id !== id);
      const hasOverlap = existingTariffs.some((t) => {
        const tFrom = new Date(t.activeFrom).getTime();
        const tTo = t.activeTo ? new Date(t.activeTo).getTime() : Infinity;
        const newFrom = finalActiveFrom.getTime();
        const newTo = finalActiveTo ? finalActiveTo.getTime() : Infinity;

        // Check if date ranges overlap
        return (newFrom >= tFrom && newFrom <= tTo) || (newTo >= tFrom && newTo <= tTo) || (newFrom <= tFrom && newTo >= tTo);
      });

      if (hasOverlap) {
        return badRequest(request, "Пересекающиеся активные тарифы запрещены", { overlap: true });
      }
    }

    const updated = updateFeeTariff(id, updates);
    if (!updated) {
      return badRequest(request, "Тариф не найден");
    }

    await logAdminAction({
      action: "fee_tariff_updated",
      entity: "fee_tariff",
      entityId: id,
      before: existingTariff,
      after: updated,
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, { tariff: updated });
  } catch (error) {
    return serverError(request, error instanceof Error ? error.message : "Ошибка обновления тарифа", error);
  }
}
