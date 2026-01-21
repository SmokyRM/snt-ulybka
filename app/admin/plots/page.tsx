import { redirect } from "next/navigation";

export default async function AdminPlotsPage() {
  redirect("/admin/registry?tab=plots");
}
