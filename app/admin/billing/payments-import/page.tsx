import { redirect } from "next/navigation";

export default async function PaymentsImportPage() {
  // Legacy redirect to new import page
  redirect("/admin/billing/payments-import-new");
}