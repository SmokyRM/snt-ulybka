import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminTicketsPage() {
  // Redirect на /admin/appeals - tickets страница больше не используется
  // Заглушка на случай если redirect не сработает
  redirect("/admin/appeals");
}

// Fallback заглушка (на случай если redirect не сработает, хотя это не должно случиться)
export function AdminTicketsPageFallback() {
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Обращения</h1>
      <p className="text-sm text-zinc-600">
        Страница &quot;Обращения&quot; была перемещена. Вы будете перенаправлены на новую страницу.
      </p>
      <Link
        href="/admin/appeals"
        className="inline-block rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42]"
      >
        Перейти к обращениям
      </Link>
    </div>
  );
}
