import { getSessionUser, getEffectiveSessionUser } from "@/lib/session.server";
import { normalizeRole } from "@/lib/rbac";
import Header from "@/components/home/Header";
import ForbiddenCtas from "./forbidden/ForbiddenCtas";

export default async function NotFound() {
  const effectiveUser = await getEffectiveSessionUser();
  const user = effectiveUser || await getSessionUser();
  const normalizedRole = normalizeRole(user?.role);
  const canAccessAdmin = normalizedRole === "admin";
  const canAccessOffice =
    normalizedRole === "admin" ||
    normalizedRole === "chairman" ||
    normalizedRole === "secretary" ||
    normalizedRole === "accountant";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm text-center">
            <h1 className="text-2xl font-semibold">Страница не найдена</h1>
            <p className="text-sm text-zinc-700">
              Похоже, такой страницы нет. Перейдите на главную или выберите раздел в меню.
            </p>
            <div className="mt-6">
              <ForbiddenCtas 
                canAccessAdmin={canAccessAdmin} 
                canAccessOffice={canAccessOffice}
                showQaCabinetButton={false}
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
