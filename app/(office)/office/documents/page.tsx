import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";

export default async function OfficeDocumentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/office/documents");
  const role = (user?.role as Role | undefined) ?? "resident";
  if (!can(role === "admin" ? "chairman" : role, "documents.manage")) {
    redirect("/forbidden");
  }
  redirect("/office/docs");
}
