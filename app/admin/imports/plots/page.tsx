import { redirect } from "next/navigation";

export default async function PlotsImportPage() {
  redirect("/admin/registry?tab=import");
}
