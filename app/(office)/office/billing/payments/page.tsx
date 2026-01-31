import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { getPlotLabel, listPaymentsWithStatus, type PaymentMatchStatus } from "@/lib/billing.store";
import PaymentsClient from "./PaymentsClient";

export default async function OfficeBillingPaymentsPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string; limit?: string; matchStatus?: string };
}) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/payments");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  try {
    assertCan(role, "finance.read", "finance");
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const q = searchParams?.q ?? "";
  const matchStatus = searchParams?.matchStatus ?? "";
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const limit = Math.min(50, Math.max(5, Number(searchParams?.limit ?? "10") || 10));
  const all = listPaymentsWithStatus({ q, matchStatus: matchStatus ? (matchStatus as PaymentMatchStatus) : null });
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
    matchReason: payment.matchReason ?? "",
    matchedPlotId: payment.matchedPlotId ?? null,
    matchStatus: payment.matchStatus ?? (payment.matchedPlotId ? "matched" : "unmatched"),
    matchCandidates: payment.matchCandidates ?? [],
    purpose: payment.purpose ?? "",
    bankRef: payment.bankRef ?? "",
    allocatedAmount: payment.allocatedAmount ?? 0,
    remainingAmount: payment.remainingAmount ?? payment.amount,
    remaining: payment.remainingAmount ?? payment.amount,
    allocationStatus: payment.allocationStatus ?? "unallocated",
    autoAllocateDisabled: Boolean(payment.autoAllocateDisabled),
  }));

  return (
    <PaymentsClient
      initialItems={items}
      initialTotal={total}
      initialPage={page}
      limit={limit}
      initialQuery={q}
      initialMatchStatus={matchStatus}
    />
  );
}
