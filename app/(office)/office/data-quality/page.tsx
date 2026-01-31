import AppLink from "@/components/AppLink";
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";

const cards = [
  {
    testId: "office-quality-card-missing-phone",
    title: "Нет телефона",
    description: "Жители без контактного номера",
    href: "/office/registry?filter=missing_phone",
  },
  {
    testId: "office-quality-card-missing-owner",
    title: "Нет владельца",
    description: "Участки без владельца",
    href: "/office/registry?filter=missing_owner",
  },
  {
    testId: "office-quality-card-missing-binding",
    title: "Нет привязки участка",
    description: "Жители без участка",
    href: "/office/registry?filter=missing_binding",
  },
  {
    testId: "office-quality-card-duplicate-phone",
    title: "Дубликаты телефонов",
    description: "Одинаковые номера у нескольких жителей",
    href: "/office/registry/duplicates?type=phone",
  },
  {
    testId: "office-quality-card-duplicate-name-plot",
    title: "Дубликаты ФИО + участка",
    description: "Одинаковые ФИО в одном участке",
    href: "/office/registry/duplicates?type=name_plot",
  },
];

export default async function OfficeDataQualityPage() {
  const session = await getEffectiveSessionUser();
  if (!session) {
    redirect("/staff-login?next=/office/data-quality");
  }
  const role = (session.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  return (
    <div className="space-y-4" data-testid="office-quality-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Качество данных</h1>
        <p className="text-sm text-zinc-600">Проверьте базовые проблемы в реестре.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <AppLink
            key={card.testId}
            href={card.href}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-[#5E704F]"
            data-testid={card.testId}
          >
            <div className="text-lg font-semibold text-zinc-900">{card.title}</div>
            <div className="mt-1 text-sm text-zinc-600">{card.description}</div>
            <div className="mt-3 text-sm font-semibold text-[#5E704F]">Открыть →</div>
          </AppLink>
        ))}
      </div>
    </div>
  );
}
