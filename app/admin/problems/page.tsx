import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProblemsPage() {
  // Redirect на /admin/appeals - problems страница больше не используется
  // Заглушка на случай если redirect не сработает
  redirect("/admin/appeals");
}

// Fallback заглушка (на случай если redirect не сработает, хотя это не должно случиться)
export function ProblemsPageFallback() {
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Проблемы</h1>
      <p className="text-sm text-zinc-600">
        Страница &quot;Проблемы&quot; была перемещена. Вы будете перенаправлены на новую страницу.
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
