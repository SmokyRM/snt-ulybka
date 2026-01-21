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
  { key: "announcements", href: "/office/announcements", label: "Объявления", rolesAllowed: ["chairman", "admin"], testId: "office-nav-announcements" },
  { key: "registry", href: "/office/registry", label: "Реестр", rolesAllowed: ["chairman", "secretary", "admin"], testId: "office-nav-registry" },
  { key: "templates", href: "/office/templates", label: "Шаблоны", rolesAllowed: ["secretary", "admin"], testId: "office-nav-templates" },
  { key: "finance", href: "/office/finance", label: "Финансы", rolesAllowed: ["accountant", "admin"], testId: "office-nav-finance" },
  { key: "quality", href: "/office/quality", label: "Качество данных", rolesAllowed: ["chairman", "secretary", "accountant", "admin"], testId: "office-nav-quality" },
];

export const getOfficeNavForRole = (role: Role): OfficeNavItem[] =>
  navConfig.filter((item) => item.rolesAllowed.includes(role === "admin" ? "admin" : role));
