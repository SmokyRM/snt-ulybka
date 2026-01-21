import { redirect } from "next/navigation";

export default async function BillingTariffsPage() {
  // Legacy redirect to new unified tariffs page
  redirect("/admin/billing/fee-tariffs");
}