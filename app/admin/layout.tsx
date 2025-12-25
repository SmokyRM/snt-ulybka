import Link from "next/link";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import AdminSidebar from "./_components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F1E9] text-sm text-red-700">
        Доступ только для администраторов
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F1E9] text-zinc-900">
      <AdminSidebar />
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
          <h1 className="text-lg font-semibold">Админка СНТ «Улыбка»</h1>
          <Link
            href="/"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Режим: Пользователь
          </Link>
        </header>
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
