import { redirect } from "next/navigation";

export default async function AdminTicketDetail() {
  // Redirect на /admin/appeals - tickets страница больше не используется
  redirect("/admin/appeals");
}
