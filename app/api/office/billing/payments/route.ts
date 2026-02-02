export const runtime = "nodejs";

import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listPaymentsWithStatus, getPlotLabel } from "@/lib/billing.store";
import { hasPgConnection, listPayments as listPaymentsPg } from "@/lib/billing/payments.pg";
import type { PaymentStatus, PaymentMatchStatus } from "@/lib/billing.store";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/payments",
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
      path: "/api/office/billing/payments",
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
    const status = searchParams.get("status") as PaymentStatus | null;
    const q = searchParams.get("q");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const matchStatus = searchParams.get("matchStatus") as PaymentMatchStatus | null;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") ?? "10") || 10));

    if (hasPgConnection()) {
      const data = await listPaymentsPg({ q, status, matchStatus, from, to, page, pageSize: limit });
      const items = data.items.map((payment) => ({
        id: payment.id,
        date: payment.paidAt ?? "",
        amount: payment.amount,
        payer: payment.payer ?? "—",
        plot: payment.plotLabel ?? payment.plotRef ?? "—",
        method: "bank",
        status: payment.status ?? "unmatched",
        matchStatus: payment.matchStatus ?? (payment.plotId ? "matched" : "unmatched"),
        matchCandidates: [],
        matchReason: "",
        matchedPlotId: payment.plotId ?? null,
        purpose: payment.purpose ?? "",
        bankRef: "",
        allocatedAmount: 0,
        remainingAmount: payment.amount,
        remaining: payment.amount,
        allocationStatus: "unallocated",
        autoAllocateDisabled: false,
      }));

      return ok(request, { items, total: data.total, page: data.page, limit: data.pageSize });
    }

    const all = listPaymentsWithStatus({ status, matchStatus, q, from, to });
    const total = all.length;
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit).map((payment) => ({
      id: payment.id,
      date: payment.date,
      amount: payment.amount,
      payer: payment.payer ?? "—",
      plot: payment.plotId ? getPlotLabel(payment.plotId) : "—",
      method: payment.method,
      status: payment.status ?? "unmatched",
      matchStatus: payment.matchStatus ?? (payment.matchedPlotId ? "matched" : "unmatched"),
      matchCandidates: payment.matchCandidates ?? [],
      matchReason: payment.matchReason ?? "",
      matchedPlotId: payment.matchedPlotId ?? null,
      purpose: payment.purpose ?? "",
      bankRef: payment.bankRef ?? "",
      allocatedAmount: payment.allocatedAmount ?? 0,
      remainingAmount: payment.remainingAmount ?? payment.amount,
      remaining: payment.remainingAmount ?? payment.amount,
      allocationStatus: payment.allocationStatus ?? "unallocated",
      autoAllocateDisabled: Boolean(payment.autoAllocateDisabled),
    }));

    return ok(request, { items, total, page, limit });
  } catch (error) {
    return serverError(request, "Ошибка загрузки платежей", error);
  }
}
