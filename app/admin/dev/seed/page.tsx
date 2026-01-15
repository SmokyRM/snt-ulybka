import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import SeedTestDataClient from "./SeedTestDataClient";

export default async function AdminSeedPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/staff/login?next=/admin");

  if (process.env.NODE_ENV === "production") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm">
        Недоступно в production.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Тестовые данные</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Заполнение тестового набора для проверки раздела «Финансы».
        </p>
      </div>
      <SeedTestDataClient />
    </div>
  );
}
