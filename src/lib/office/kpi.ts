import "server-only";

import { listAppeals } from "@/lib/appeals.store";
import { overdue, dueSoon } from "@/lib/sla";

export type OfficeKpiCounters = {
  overdue: number;
  dueSoon: number;
  missingAssignee: number;
  missingDueAt: number;
};

/**
 * Sprint 3.4: KPI счетчики для Office dashboard
 * Агрегация на сервере (без N+1, один проход)
 */
export function getOfficeKpiCounters(): OfficeKpiCounters {
  // Получаем все обращения одним запросом (без N+1)
  const appeals = listAppeals({ q: undefined });

  // Агрегация за один проход (эффективно, без дополнительных запросов)
  let overdueCount = 0;
  let dueSoonCount = 0;
  let missingAssigneeCount = 0;
  let missingDueAtCount = 0;

  const now = new Date();

  for (const appeal of appeals) {
    const isOpen = appeal.status !== "closed";
    
    if (isOpen) {
      // Sprint 3.4: overdue и dueSoon используем функции из sla.ts
      if (overdue(appeal.dueAt, now)) {
        overdueCount++;
      } else if (dueSoon(appeal.dueAt, now)) {
        dueSoonCount++;
      }
      
      // Sprint 3.4: missingDueAt - нет dueAt
      if (!appeal.dueAt) {
        missingDueAtCount++;
      }
      
      // Sprint 3.4: missingAssignee - нет assignedToUserId (и нет assigneeRole для обратной совместимости)
      const assignedToUserId = appeal.assignedToUserId ?? appeal.assigneeUserId ?? null;
      if (!assignedToUserId && !appeal.assigneeRole) {
        missingAssigneeCount++;
      }
    }
  }

  return {
    overdue: overdueCount,
    dueSoon: dueSoonCount,
    missingAssignee: missingAssigneeCount,
    missingDueAt: missingDueAtCount,
  };
}
