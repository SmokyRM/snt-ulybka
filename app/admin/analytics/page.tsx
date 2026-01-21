import { redirect } from "next/navigation";

export default async function RegistryAnalyticsPage() {
  redirect("/admin/registry?tab=issues");
}
