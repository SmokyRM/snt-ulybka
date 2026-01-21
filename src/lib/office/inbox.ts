import "server-only";

import { listAppeals } from "@/lib/appeals.store";
import type { Appeal, AppealStatus } from "@/lib/office/types";
import { overdue, dueSoon } from "@/lib/sla";
import { findUserById } from "@/lib/mockDb";

export type GetInboxItemsParams = {
  status?: AppealStatus | "overdue" | "due_soon";
  risk?: "overdue" | "duesoon"; // Sprint 3.2: быстрый фильтр по риску
  mine?: boolean;
  q?: string;
  sort?: "createdAt" | "dueAt" | "updatedAt";
  dir?: "asc" | "desc";
  limit?: number;
  offset?: number;
  actor?: {
    userId?: string;
    role?: string;
  };
};

export type InboxItem = {
  id: string;
  title: string;
  plot?: string;
  author?: string;
  status: AppealStatus;
  assignedTo?: string; // Deprecated: используйте assigneeUserId
  assigneeUserId?: string; // ID назначенного пользователя
  assigneeRole?: "chairman" | "secretary" | "accountant" | "admin"; // Назначенная роль
  assigneeName?: string; // Имя назначенного пользователя (если есть)
  dueAt?: string | null;
  updatedAt: string;
  createdAt: string;
};

export type GetInboxItemsResult = {
  items: InboxItem[];
  total: number;
  hasMore: boolean;
};

/**
 * Серверная выборка для inbox с фильтрацией, сортировкой и пагинацией
 * Без N+1: один проход по данным для всех фильтров
 */
export function getInboxItems(params: GetInboxItemsParams = {}): GetInboxItemsResult {
  const {
    status,
    risk, // Sprint 3.2: быстрый фильтр по риску
    mine = false,
    q,
    sort = "updatedAt",
    dir = "desc",
    limit = 50,
    offset = 0,
    actor,
  } = params;

  // Получаем все обращения одним запросом (без N+1)
  // listAppeals уже делает один запрос и возвращает все данные
  let appeals = listAppeals({ q: undefined });

  const now = new Date();

  // Фильтр по статусу
  // Если status не задан — показываем только open (не closed)
  if (status === undefined) {
    appeals = appeals.filter((appeal) => appeal.status !== "closed");
  } else if (status === "overdue") {
    // Просроченные: используем функцию overdue из sla.ts
    appeals = appeals.filter((appeal) => {
      if (appeal.status === "closed") return false;
      return overdue(appeal.dueAt, now);
    });
  } else if (status === "due_soon") {
    // Скоро срок: используем функцию dueSoon из sla.ts
    appeals = appeals.filter((appeal) => {
      if (appeal.status === "closed") return false;
      return dueSoon(appeal.dueAt, now);
    });
  } else {
    // Обычный статус
    appeals = appeals.filter((appeal) => appeal.status === status);
  }

  // Sprint 3.2: Фильтр по риску (risk=overdue|duesoon)
  if (risk === "overdue") {
    appeals = appeals.filter((appeal) => {
      if (appeal.status === "closed") return false;
      return overdue(appeal.dueAt, now);
    });
  } else if (risk === "duesoon") {
    appeals = appeals.filter((appeal) => {
      if (appeal.status === "closed") return false;
      return dueSoon(appeal.dueAt, now);
    });
  }

  // Фильтр mine: только assignedToUserId текущего пользователя (Sprint 2.1)
  // mine=true: только мои (assignedToUserId === текущий userId)
  // mine=false или undefined: все (не фильтруем)
  if (mine === true) {
    if (actor?.userId) {
      // Фильтруем только по assignedToUserId (Sprint 2.1)
      appeals = appeals.filter((appeal) => {
        const assignedToUserId = appeal.assignedToUserId ?? appeal.assigneeUserId ?? null;
        return assignedToUserId === actor.userId;
      });
    } else {
      // Если userId нет, возвращаем пустой список (mine=1 требует userId)
      appeals = [];
    }
  }
  // mine === false или undefined: показываем все (не фильтруем)

  // Поиск по q (поиск по доступным полям модели Appeal)
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    appeals = appeals.filter((appeal) => {
      // Поиск по ID обращения
      if (appeal.id.toLowerCase().includes(query)) return true;
      // Поиск по заголовку (title)
      if (appeal.title.toLowerCase().includes(query)) return true;
      // Поиск по описанию (body/description)
      if (appeal.body?.toLowerCase().includes(query)) return true;
      // Поиск по ФИО (authorName)
      if (appeal.authorName?.toLowerCase().includes(query)) return true;
      // Поиск по телефону (authorPhone)
      if (appeal.authorPhone?.toLowerCase().includes(query)) return true;
      // Поиск по номеру участка (plotNumber)
      if (appeal.plotNumber?.toLowerCase().includes(query)) return true;
      return false;
    });
  }

  // Сортировка (выполняем до пагинации)
  appeals = [...appeals].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    if (sort === "createdAt") {
      aValue = new Date(a.createdAt).getTime();
      bValue = new Date(b.createdAt).getTime();
    } else if (sort === "dueAt") {
      // Sprint 3.2: Для dueAt null значения всегда идут в конец (независимо от направления сортировки)
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1; // null всегда в конец
      if (!b.dueAt) return -1; // null всегда в конец
      aValue = new Date(a.dueAt).getTime();
      bValue = new Date(b.dueAt).getTime();
    } else {
      // updatedAt (по умолчанию)
      aValue = new Date(a.updatedAt).getTime();
      bValue = new Date(b.updatedAt).getTime();
    }

    const diff = aValue - bValue;
    return dir === "asc" ? diff : -diff;
  });

  // Пагинация: offset + limit
  const total = appeals.length;
  const hasMore = offset + limit < total;
  const paginatedAppeals = appeals.slice(offset, offset + limit);

  // Преобразуем в InboxItem формат (только нужные поля, без N+1)
  const items: InboxItem[] = paginatedAppeals.map((appeal) => {
    // Sprint 2.1: используем assignedToUserId (с fallback на assigneeUserId для обратной совместимости)
    const assignedToUserId = appeal.assignedToUserId ?? appeal.assigneeUserId ?? null;
    
    // Получаем имя пользователя, если назначен по userId
    let assigneeName: string | undefined;
    if (assignedToUserId) {
      const user = findUserById(assignedToUserId);
      assigneeName = user?.fullName || undefined;
    }

    return {
      id: appeal.id,
      title: appeal.title,
      plot: appeal.plotNumber,
      author: appeal.authorName,
      status: appeal.status,
      assignedTo: assignedToUserId ?? undefined, // Deprecated, для обратной совместимости
      assigneeUserId: assignedToUserId ?? undefined, // Для обратной совместимости
      assigneeRole: appeal.assigneeRole,
      assigneeName,
      dueAt: appeal.dueAt,
      updatedAt: appeal.updatedAt,
      createdAt: appeal.createdAt,
    };
  });

  return {
    items,
    total,
    hasMore,
  };
}

export type InboxCounters = {
  totalOpen: number;
  myOpen: number;
  dueSoon: number;
  overdue: number;
};

/**
 * Агрегация счетчиков для inbox (без N+1, один проход)
 * Использует функции isOverdue/isDueSoon из appealsSla для консистентности
 * 
 * Sprint 2.4: Обновленные счетчики
 * - myOpen = открытые обращения, где assignedToUserId === currentUser.id
 * - totalOpen = все открытые обращения (status !== "closed")
 * - dueSoon = открытые обращения, у которых скоро срок (в ближайшие 48 часов), если dueAt существует
 * - overdue = открытые обращения, которые просрочены, если dueAt существует
 */
export function getInboxCounters(params: { userId?: string; role?: string } = {}): InboxCounters {
  const { userId } = params;

  // Получаем все обращения одним запросом (без N+1)
  // listAppeals уже делает один запрос и возвращает все данные
  const appeals = listAppeals({ q: undefined });

  // Агрегация за один проход (эффективно, без дополнительных запросов)
  let totalOpen = 0;
  let myOpen = 0;
  let dueSoonCount = 0;
  let overdueCount = 0;

  const now = new Date();

  for (const appeal of appeals) {
    const isOpen = appeal.status !== "closed";
    
    if (isOpen) {
      totalOpen++;
      
      // Sprint 2.4: myOpen = открытые обращения, где assignedToUserId === currentUser.id
      // Используем только assignedToUserId (без fallback на устаревшее assigneeUserId)
      if (userId && appeal.assignedToUserId === userId) {
        myOpen++;
      }
      
      // Sprint 3.2: dueSoon/overdue используем функции из sla.ts для консистентности
      // Проверяем overdue и dueSoon только для открытых обращений
      if (overdue(appeal.dueAt, now)) {
        overdueCount++;
      } else if (dueSoon(appeal.dueAt, now)) {
        dueSoonCount++;
      }
    }
  }

  return {
    totalOpen,
    myOpen,
    dueSoon: dueSoonCount,
    overdue: overdueCount,
  };

}
