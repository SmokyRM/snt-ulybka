<<<<<<< HEAD
import Link from "next/link";
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const cards: Array<{
  label: string;
  href: string;
  description: string;
  testId: string;
  permission: import("@/lib/rbac").Capability;
}> = [
  {
    label: "Обращения",
    href: "/office/appeals",
    description: "Заявки жителей и ответы",
    testId: "office-tile-appeals",
    permission: "office.appeals.read",
  },
  {
    label: "Объявления",
    href: "/office/announcements",
    description: "Публикации и черновики",
    testId: "office-tile-announcements",
    permission: "office.announcements.read",
  },
  {
    label: "Документы",
    href: "/office/documents",
    description: "Шаблоны и файлы",
    testId: "office-tile-documents",
    // Пока отдельного permission нет — считаем доступным для всех staff, у кого есть office.access
    permission: "office.access",
  },
  {
    label: "Платежи и долги",
    href: "/office/finance",
    description: "Начисления, должники, отчёты",
    testId: "office-tile-finance",
    permission: "office.finance.view",
  },
];

export default async function OfficeIndex() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office");
  const rawRole = user.role as Role | undefined;
  const role: Role = rawRole ?? "resident";

  const { canAccess, getForbiddenReason } = await import("@/lib/rbac");

  // Серверный guard: если нет доступа к офису вообще — редиректим на /forbidden с кодом
  if (!canAccess(role, "office.access")) {
    const reason = getForbiddenReason(role, "office.access");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office")}`);
  }

  // Фильтрация плиток по canAccess
  const visible = cards.filter((card) => canAccess(role, card.permission));

  return (
    <div className="space-y-4" data-testid="office-dashboard-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Офис СНТ</h1>
        <p className="text-sm text-zinc-600">Рабочие разделы для правления и бухгалтерии</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            data-testid={card.testId}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm transition hover:border-[#5E704F]"
          >
            <div className="text-lg font-semibold text-zinc-900">{card.label}</div>
            <div className="mt-1 text-sm text-zinc-600">{card.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
=======
import { redirect } from "next/navigation";

export default function OfficeIndex() {
  redirect("/office/dashboard");
>>>>>>> 737c5be (codex snapshot)
}
