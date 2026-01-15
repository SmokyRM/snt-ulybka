import type { Role } from "./permissions";

export type OfficeNavItem = {
  key: string;
  href: string;
  label: string;
  rolesAllowed: Role[];
  testId?: string;
};

const navConfig: OfficeNavItem[] = [
  { key: "dashboard", href: "/office/dashboard", label: "Дашборд", rolesAllowed: ["chairman", "secretary", "accountant", "admin"], testId: "office-nav-dashboard" },
  { key: "appeals", href: "/office/appeals", label: "Обращения", rolesAllowed: ["chairman", "secretary", "admin"], testId: "office-nav-appeals" },
  { key: "announcements", href: "/office/announcements", label: "Объявления", rolesAllowed: ["chairman", "secretary", "accountant", "admin"], testId: "office-nav-announcements" },
  { key: "registry", href: "/office/registry", label: "Реестр", rolesAllowed: ["chairman", "secretary", "accountant", "admin"], testId: "office-nav-registry" },
  { key: "templates", href: "/office/templates", label: "Шаблоны", rolesAllowed: ["chairman", "secretary", "admin"], testId: "office-nav-templates" },
  { key: "finance", href: "/office/finance", label: "Финансы", rolesAllowed: ["chairman", "secretary", "accountant", "admin"], testId: "office-nav-finance" },
];

export const getOfficeNavForRole = (role: Role): OfficeNavItem[] =>
  navConfig.filter((item) => item.rolesAllowed.includes(role === "admin" ? "admin" : role));
