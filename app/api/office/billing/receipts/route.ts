import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listDebts, getPlotLabel } from "@/lib/billing.store";

export type ReceiptData = {
  id: string;
  plotId: string;
  plotLabel: string;
  residentName: string;
  debt: number;
  period: string;
  generatedAt: string;
};

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/receipts",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/receipts",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const minDebt = Number(searchParams.get("minDebt") ?? "0");
    const period = searchParams.get("period") ?? new Date().toISOString().slice(0, 7);

    const debts = listDebts().filter((d) => d.debt >= minDebt);

    const receipts: ReceiptData[] = debts.map((debt, idx) => ({
      id: `receipt-${idx + 1}`,
      plotId: debt.key,
      plotLabel: debt.plotId,
      residentName: debt.residentName,
      debt: debt.debt,
      period,
      generatedAt: new Date().toISOString(),
    }));

    return ok(request, {
      receipts,
      summary: {
        count: receipts.length,
        totalDebt: receipts.reduce((sum, r) => sum + r.debt, 0),
        period,
      },
    });
  } catch (error) {
    return serverError(request, "Ошибка генерации квитанций", error);
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/receipts",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/receipts",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const plotIds = Array.isArray(body.plotIds) ? body.plotIds : [];
    const period = typeof body.period === "string" ? body.period : new Date().toISOString().slice(0, 7);

    if (plotIds.length === 0) {
      return fail(request, "validation_error", "Необходимо указать участки", 400);
    }

    const debts = listDebts().filter((d) => plotIds.includes(d.key));

    const receipts: ReceiptData[] = debts.map((debt, idx) => ({
      id: `receipt-${idx + 1}`,
      plotId: debt.key,
      plotLabel: debt.plotId,
      residentName: debt.residentName,
      debt: debt.debt,
      period,
      generatedAt: new Date().toISOString(),
    }));

    return ok(request, {
      receipts,
      summary: {
        count: receipts.length,
        totalDebt: receipts.reduce((sum, r) => sum + r.debt, 0),
        period,
      },
    });
  } catch (error) {
    return serverError(request, "Ошибка генерации квитанций", error);
  }
}
