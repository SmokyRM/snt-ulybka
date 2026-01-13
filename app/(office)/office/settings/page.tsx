import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";

export default async function OfficeSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/office/settings");
  const role = (user?.role as Role | undefined) ?? "resident";
  if (!can(role === "admin" ? "chairman" : role, "settings.manage")) {
    redirect("/forbidden");
  }
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h1 className="text-xl font-semibold text-zinc-900">Настройки</h1>
      <p className="text-sm text-zinc-600">Раздел в разработке.</p>
    </div>
  );
}
