import "server-only";

import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin, can } from "@/lib/rbac";
import { listAppeals } from "@/lib/appeals.store";
import { listRegistry } from "@/lib/registry.store";
import { getDb } from "@/lib/mockDb";
import { listDebts } from "@/lib/billing.store";
import { normalizePhone } from "@/lib/utils/phone";
import { logStructured } from "@/lib/structuredLogger/node";
import type { Plot } from "@/types/snt";

export type SearchResult = {
  plots: SearchPlot[];
  appeals: SearchAppeal[];
  people?: SearchPerson[];
  finance?: SearchFinance[];
};

export type SearchPlot = {
  id: string;
  plotNumber: string;
  street?: string;
  ownerName?: string | null;
  phone?: string | null;
  href: string;
};

export type SearchAppeal = {
  id: string;
  title: string;
  plotNumber?: string;
  authorName?: string;
  status: string;
  href: string;
};

export type SearchPerson = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  href: string;
};

export type SearchFinance = {
  id: string;
  plotNumber: string;
  residentName: string;
  debt: number;
  href: string;
};

export type SearchAllParams = {
  q: string;
  limit?: number;
};

// Минимальная длина запроса для защиты от тяжелых запросов
const MIN_QUERY_LENGTH = 2;
// Максимальная длина запроса
const MAX_QUERY_LENGTH = 100;
// Лимиты результатов по умолчанию
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function searchAll(params: SearchAllParams): Promise<SearchResult> {
  const startTime = Date.now();
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }

  const { q, limit = DEFAULT_LIMIT } = params;
  const trimmedQuery = q.trim();
  
  // Защита от тяжелых запросов
  if (trimmedQuery.length < MIN_QUERY_LENGTH) {
    return { plots: [], appeals: [] };
  }
  
  if (trimmedQuery.length > MAX_QUERY_LENGTH) {
    throw new Error("QUERY_TOO_LONG");
  }
  
  // Ограничиваем лимит
  const safeLimit = Math.min(Math.max(1, limit || DEFAULT_LIMIT), MAX_LIMIT);
  
  // Sprint 4.4: Нормализуем запрос для поиска по телефонам
  const query = trimmedQuery.toLowerCase();
  const normalizedQuery = normalizePhone(trimmedQuery); // Нормализованный запрос (только цифры) для поиска по телефонам

  const result: SearchResult = {
    plots: [],
    appeals: [],
  };

  // Поиск по участкам (plots) - доступен всем staff/admin
  // TODO: Sprint 4.4 - Добавить индексы на поля plots.number (или эквивалент) для ускорения поиска
  // Если используется mock DB - индексы не поддерживаются, добавить при переходе на реальную БД
  const db = getDb();
  const plots = db.plots.filter((plot) => {
    // Обычный текстовый поиск
    const haystack = `${plot.plotNumber} ${plot.street} ${plot.ownerFullName ?? ""} ${plot.email ?? ""} ${plot.cadastral ?? ""}`.toLowerCase();
    if (haystack.includes(query)) return true;
    
    // Sprint 4.4: Поиск по нормализованному телефону
    if (normalizedQuery && plot.phone) {
      const normalizedPhone = normalizePhone(plot.phone);
      if (normalizedPhone.includes(normalizedQuery)) return true;
    }
    
    return false;
  }).slice(0, safeLimit);

  result.plots = plots.map((plot) => ({
    id: plot.id,
    plotNumber: plot.plotNumber,
    street: plot.street,
    ownerName: plot.ownerFullName,
    phone: plot.phone,
    href: `/office/registry/${plot.id}`,
  }));

  // Также ищем в registry
  const registryItems = listRegistry({ q: query });
  const registryPlots = registryItems
    .filter((item) => !result.plots.some((p) => p.plotNumber === item.plotNumber))
    .slice(0, safeLimit - result.plots.length)
    .map((item) => ({
      id: item.id,
      plotNumber: item.plotNumber,
      ownerName: item.ownerName,
      phone: item.phone,
      href: `/office/registry/${item.id}`,
    }));
  result.plots.push(...registryPlots);
  result.plots = result.plots.slice(0, safeLimit);

  // Поиск по обращениям (appeals) - доступен всем staff/admin
  // TODO: Sprint 4.4 - Добавить индексы на поля appeals.id, appeals.createdAt, appeals.dueAt для ускорения поиска
  // Если используется mock DB - индексы не поддерживаются, добавить при переходе на реальную БД
  const allAppeals = listAppeals({ q: undefined });
  const appeals = allAppeals.filter((appeal) => {
    // Обычный текстовый поиск
    const haystack = `${appeal.id} ${appeal.title} ${appeal.plotNumber ?? ""} ${appeal.authorName ?? ""}`.toLowerCase();
    if (haystack.includes(query)) return true;
    
    // Sprint 4.4: Поиск по нормализованному телефону автора
    if (normalizedQuery && appeal.authorPhone) {
      const normalizedPhone = normalizePhone(appeal.authorPhone);
      if (normalizedPhone.includes(normalizedQuery)) return true;
    }
    
    return false;
  }).slice(0, safeLimit);
  
  result.appeals = appeals.map((appeal) => ({
    id: appeal.id,
    title: appeal.title,
    plotNumber: appeal.plotNumber,
    authorName: appeal.authorName,
    status: appeal.status,
    href: `/office/appeals/${appeal.id}`,
  }));

  // Поиск по людям (people) - из участков и registry
  const peopleMap = new Map<string, SearchPerson>();
  
  // Добавляем людей из plots
  plots.forEach((plot) => {
    const nameMatch = plot.ownerFullName && plot.ownerFullName.toLowerCase().includes(query);
    const phoneMatch = normalizedQuery && plot.phone && normalizePhone(plot.phone).includes(normalizedQuery);
    if (plot.ownerFullName && (nameMatch || phoneMatch)) {
      const key = `${plot.ownerFullName}_${plot.phone ?? ""}`;
      if (!peopleMap.has(key)) {
        peopleMap.set(key, {
          id: `plot_${plot.id}`,
          name: plot.ownerFullName,
          phone: plot.phone ?? undefined,
          email: plot.email ?? undefined,
          href: `/office/registry/${plot.id}`,
        });
      }
    }
  });
  
  // Добавляем людей из registry
  registryItems.forEach((item) => {
    const nameMatch = item.ownerName && item.ownerName.toLowerCase().includes(query);
    const phoneMatch = normalizedQuery && item.phone && normalizePhone(item.phone).includes(normalizedQuery);
    if (item.ownerName && (nameMatch || phoneMatch)) {
      const key = `${item.ownerName}_${item.phone ?? ""}`;
      if (!peopleMap.has(key)) {
        peopleMap.set(key, {
          id: `registry_${item.id}`,
          name: item.ownerName,
          phone: item.phone ?? undefined,
          email: item.email ?? undefined,
          href: `/office/registry/${item.id}`,
        });
      }
    }
  });
  
  // Добавляем людей из persons
  // TODO: Sprint 4.4 - Добавить индексы на поля contact.phone (если есть модель) для ускорения поиска
  // Если используется mock DB - индексы не поддерживаются, добавить при переходе на реальную БД
  const persons = db.persons.filter((person) => {
    // Обычный текстовый поиск
    const haystack = `${person.fullName ?? ""} ${person.email ?? ""}`.toLowerCase();
    if (haystack.includes(query)) return true;
    
    // Sprint 4.4: Поиск по нормализованному телефону
    if (normalizedQuery && person.phone) {
      const normalizedPhone = normalizePhone(person.phone);
      if (normalizedPhone.includes(normalizedQuery)) return true;
    }
    
    return false;
  }).slice(0, safeLimit);
  
  persons.forEach((person) => {
    if (person.fullName) {
      const key = `${person.fullName}_${person.phone ?? ""}`;
      if (!peopleMap.has(key)) {
        peopleMap.set(key, {
          id: person.id,
          name: person.fullName,
          phone: person.phone ?? undefined,
          email: person.email ?? undefined,
          href: `/office/registry?q=${encodeURIComponent(person.fullName)}`,
        });
      }
    }
  });
  
  result.people = Array.from(peopleMap.values()).slice(0, safeLimit);

  // Поиск по финансам (finance) - только для accountant/admin
  if (role === "accountant" || role === "admin") {
    const debts = listDebts({ q: query });
    result.finance = debts.slice(0, limit).map((debt) => ({
      id: debt.key,
      plotNumber: debt.plotId,
      residentName: debt.residentName,
      debt: debt.debt,
      href: `/office/finance?q=${encodeURIComponent(query)}`,
    }));
  }

  // Sprint 4.4: Логирование времени поиска
  const latencyMs = Date.now() - startTime;
  logStructured("info", {
    action: "office_search",
    path: "/office/search",
    role: role,
    userId: user.id ?? null,
    latencyMs,
    message: "Search completed",
    searchQuery: trimmedQuery.substring(0, 50), // Ограничиваем длину для логирования
    searchQueryLength: trimmedQuery.length,
    resultCounts: {
      plots: result.plots.length,
      appeals: result.appeals.length,
      people: result.people?.length ?? 0,
      finance: result.finance?.length ?? 0,
    },
  });

  return result;
}
