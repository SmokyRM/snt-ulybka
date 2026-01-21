import Link from "next/link";
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { hasPermission, isOfficeRole, isStaffOrAdmin, type Permission } from "@/lib/rbac";
import { listAppeals } from "@/lib/office/appeals.server";
import { listAnnouncements } from "@/lib/office/announcements.server";
import { searchPlots } from "@/lib/office/registry.server";

type TileData = {
  label: string;
  href: string;
  capability: string;
  description: string;
  stats?: { label: string; value: string | number }[];
};

export default async function OfficeDashboardPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/dashboard");
  const role = (user.role as Role | undefined) ?? "resident";
  // КРИТИЧНО: /office/dashboard должен быть доступен для всех office ролей + admin
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  // Получаем статистику для карточек
  const appeals = hasPermission(role, "appeals.view") ? listAppeals() : [];
  const appealsNew = appeals.filter((a) => a.status === "new").length;
  const appealsInWork = appeals.filter((a) => a.status === "in_progress").length;

  const announcements = hasPermission(role, "announcements.view") ? listAnnouncements() : [];
  const announcementsCount = announcements.length;

  const plots = hasPermission(role, "registry.view") ? await searchPlots("") : [];
  const totalPlots = plots.length;

  // Определяем доступные карточки в зависимости от роли
  const tiles: TileData[] = [];

  // Обращения - для chairman/secretary/admin
  if (hasPermission(role, "appeals.view")) {
    tiles.push({
      label: "Обращения",
      href: "/office/appeals",
      capability: "appeals.view",
      description: "Обращения жителей и ответы",
      stats: [
        { label: "Новые", value: appealsNew },
        { label: "В работе", value: appealsInWork },
      ],
    });
  }

  // Объявления - для всех office ролей
  if (hasPermission(role, "announcements.view")) {
    tiles.push({
      label: "Объявления",
      href: "/office/announcements",
      capability: "announcements.view",
      description: "Публикации для жителей",
      stats: [{ label: "Всего", value: announcementsCount }],
    });
  }

  // Реестр - для всех office ролей
  if (hasPermission(role, "registry.view")) {
    tiles.push({
      label: "Реестр",
      href: "/office/registry",
      capability: "registry.view",
      description: "Участки и контакты",
      stats: [{ label: "Участков", value: totalPlots }],
    });
  }

  // Финансы - для accountant/chairman/secretary/admin
  if (hasPermission(role, "finance.view")) {
    tiles.push({
      label: "Финансы",
      href: "/office/finance",
      capability: "finance.view",
      description: "Должники, выгрузки и отчёты",
    });
  }

  // Фильтруем по capability для дополнительной проверки через permissions
  const allowedTiles = tiles.filter((tile) => {
    // Маппим capability в permissions для проверки через hasPermission
    const permissionMap: Record<string, Permission> = {
      "appeals.view": "appeals.view",
      "announcements.view": "announcements.view",
      "registry.view": "registry.view",
      "finance.view": "finance.view",
    };
    const permission = permissionMap[tile.capability];
    if (permission) {
      return hasPermission(role, permission);
    }
    // Fallback на can для совместимости
    return can(role === "admin" ? "chairman" : role, tile.capability);
  });

  // Quick actions в зависимости от роли
  type QuickAction = { label: string; href: string; variant?: "primary" | "secondary" };
  const quickActions: QuickAction[] = [];
  const roleValue = role as Role | undefined;

  if (roleValue === "chairman" || roleValue === "admin") {
    // chairman: "Создать объявление", "Открыть обращения", "Открыть реестр"
    if (hasPermission(roleValue, "announcements.manage")) {
      quickActions.push({ label: "Создать объявление", href: "/office/announcements/new", variant: "primary" });
    }
    if (hasPermission(roleValue, "appeals.view")) {
      quickActions.push({ label: "Открыть обращения", href: "/office/appeals", variant: "secondary" });
    }
    if (hasPermission(roleValue, "registry.view")) {
      quickActions.push({ label: "Открыть реестр", href: "/office/registry", variant: "secondary" });
    }
  }
  if (roleValue === "secretary" || roleValue === "admin") {
    // secretary: "Новые обращения", "Шаблоны", "Реестр"
    if (hasPermission(roleValue, "appeals.view")) {
      quickActions.push({ label: "Новые обращения", href: "/office/appeals?status=new", variant: "primary" });
    }
    if (hasPermission(roleValue, "announcements.manage")) {
      quickActions.push({ label: "Шаблоны", href: "/office/templates", variant: "secondary" });
    }
    if (hasPermission(roleValue, "registry.view")) {
      quickActions.push({ label: "Реестр", href: "/office/registry", variant: "secondary" });
    }
  }
  if (roleValue === "accountant" || roleValue === "admin") {
    // accountant: "Импорт платежей", "Должники", "Экспорт"
    if (hasPermission(roleValue, "finance.view")) {
      quickActions.push({ label: "Импорт платежей", href: "/admin/billing/payments-import", variant: "primary" });
      quickActions.push({ label: "Должники", href: "/office/finance?period=all", variant: "secondary" });
    }
    if (hasPermission(roleValue, "finance.export")) {
      quickActions.push({ label: "Экспорт", href: "/office/exports", variant: "secondary" });
    }
  }

  return (
    <div className="space-y-6" data-testid="office-dashboard">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Офис СНТ</h1>
        <p className="text-sm text-zinc-600">Быстрый доступ к рабочим разделам</p>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="office-quick-actions">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                action.variant === "primary"
                  ? "bg-[#5E704F] text-white hover:bg-[#4f5f42]"
                  : "border border-[#5E704F] text-[#5E704F] hover:bg-[#5E704F] hover:text-white"
              }`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}

      {/* Карточки разделов */}
      {allowedTiles.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600">
          Нет доступных разделов.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {allowedTiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm transition hover:border-[#5E704F] hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-lg font-semibold text-zinc-900">{tile.label}</div>
                  <div className="mt-1 text-sm text-zinc-600">{tile.description}</div>
                </div>
              </div>
              {tile.stats && tile.stats.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tile.stats.map((stat, idx) => (
                    <div key={idx} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                      {stat.label}: {stat.value}
                    </div>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
