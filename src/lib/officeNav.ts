import type { Role } from "./permissions";

export type OfficeNavItem = {
  key: string;
  href: string;
  label: string;
  rolesAllowed: Role[];
  testId?: string;
};

const navConfig: OfficeNavItem[] = [
  { key: "dashboard", href: "/office", label: "Дашборд", rolesAllowed: ["chairman", "secretary", "accountant", "admin"], testId: "office-nav-dashboard" },
  { key: "inbox", href: "/office/inbox", label: "Очередь работы", rolesAllowed: ["chairman", "secretary", "accountant", "admin"], testId: "office-nav-inbox" },
  { key: "search", href: "/office/search", label: "Поиск", rolesAllowed: ["chairman", "secretary", "accountant", "admin"], testId: "office-nav-search" },
  { key: "appeals", href: "/office/appeals", label: "Обращения", rolesAllowed: ["chairman", "secretary", "admin"], testId: "office-nav-appeals" },
  { key: "meetings", href: "/office/meetings", label: "Протоколы", rolesAllowed: ["chairman", "secretary", "admin"], testId: "office-nav-meetings" },
  { key: "decisions", href: "/office/decisions", label: "Решения", rolesAllowed: ["chairman", "secretary", "admin"], testId: "office-nav-decisions" },
  { key: "announcements", href: "/office/announcements", label: "Объявления", rolesAllowed: ["chairman", "admin"], testId: "office-nav-announcements" },
  { key: "registry", href: "/office/registry", label: "Реестр", rolesAllowed: ["chairman", "secretary", "admin"], testId: "office-nav-registry" },
  { key: "docs", href: "/office/docs", label: "Документы", rolesAllowed: ["chairman", "secretary", "admin"], testId: "office-nav-docs" },
  { key: "works", href: "/office/works", label: "Работы", rolesAllowed: ["chairman", "secretary", "admin"], testId: "office-nav-works" },
  { key: "templates", href: "/office/templates", label: "Шаблоны", rolesAllowed: ["secretary", "admin"], testId: "office-nav-templates" },
  { key: "billing", href: "/office/billing", label: "Биллинг", rolesAllowed: ["accountant", "admin"], testId: "office-nav-billing" },
  { key: "notifications", href: "/office/notifications/campaigns", label: "Уведомления", rolesAllowed: ["chairman", "admin"], testId: "office-nav-notifications" },
  { key: "jobs", href: "/office/jobs", label: "Задачи", rolesAllowed: ["chairman", "secretary", "accountant", "admin"], testId: "office-nav-jobs" },
  { key: "quality", href: "/office/data-quality", label: "Качество данных", rolesAllowed: ["chairman", "secretary", "accountant", "admin"], testId: "office-nav-quality" },
];

export const getOfficeNavForRole = (role: Role): OfficeNavItem[] =>
  navConfig.filter((item) => item.rolesAllowed.includes(role === "admin" ? "admin" : role));
