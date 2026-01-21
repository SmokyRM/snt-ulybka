import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, normalizeRole } from "@/lib/rbac";
import QualityClient from "./QualityClient";

export default async function QualityPage() {
  // Check production if needed
  if (process.env.DISABLE_QUALITY_PAGE === "true") {
    redirect("/admin");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/quality");
  }

  const normalizedRole = normalizeRole(user.role);
  if (!isAdminRole(normalizedRole)) {
    redirect("/forbidden?reason=admin.only&next=/admin/quality");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Качество данных</h1>
            <p className="text-sm text-zinc-600">Обнаружение и исправление проблем в данных реестра</p>
          </div>
        </div>

        <QualityClient />
      </div>
    </main>
  );
}
