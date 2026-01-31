import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { listOfficeDocuments } from "@/lib/office/documentsRegistry.store";
import DocsClient from "./DocsClient";

export default async function OfficeDocsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/staff/login?next=/office/docs");
  const role = (user?.role as Role | undefined) ?? "resident";
  if (!can(role === "admin" ? "chairman" : role, "documents.manage")) {
    redirect("/forbidden");
  }

  const initialItems = listOfficeDocuments();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Реестр документов</h1>
        <p className="text-sm text-zinc-600">Протоколы, сметы, акты и устав</p>
      </div>
      <DocsClient initialItems={initialItems} />
    </div>
  );
}
