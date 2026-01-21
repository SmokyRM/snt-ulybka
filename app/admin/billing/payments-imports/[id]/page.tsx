import { redirect, notFound } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { findPaymentImportById } from "@/lib/mockDb";
import PaymentImportDetailClient from "./PaymentImportDetailClient";

export default async function PaymentImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/billing/payments-imports");
  }
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=finance.access&next=/admin/billing/payments-imports");
  }

  const { id } = await params;
  const import_ = findPaymentImportById(id);
  if (!import_) {
    notFound();
  }

  return <PaymentImportDetailClient importId={id} />;
}
