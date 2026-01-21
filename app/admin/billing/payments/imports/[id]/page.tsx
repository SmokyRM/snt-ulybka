import { redirect, notFound } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import { findPaymentImportById } from "@/lib/mockDb";
import ImportDetailClient from "./ImportDetailClient";

export default async function PaymentImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/staff-login?next=/admin/billing/payments/imports");
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=billing&next=/admin/billing/payments/imports");
  }

  const { id } = await params;
  const imp = findPaymentImportById(id);
  if (!imp) notFound();

  return <ImportDetailClient importId={id} />;
}
