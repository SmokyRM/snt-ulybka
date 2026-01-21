"use client";

import { useState, useEffect } from "react";
import type { ActivityLogEntry } from "@/lib/activityLog.store";

type Props = {
  appealId: string;
  logs: ActivityLogEntry[];
};

const roleLabels: Record<string, string> = {
  chairman: "Председатель",
  secretary: "Секретарь",
  accountant: "Бухгалтер",
  admin: "Администратор",
  system: "Система",
};

const statusLabels: Record<string, string> = {
  new: "Новое",
  in_progress: "В работе",
  needs_info: "Требует уточнения",
  closed: "Закрыто",
};

/**
 * Форматирует запись ActivityLog в человекочитаемый текст
 */
function formatActivityLogEntry(log: ActivityLogEntry): string {
  const meta = log.meta || {};
  
  switch (log.action) {
    case "created":
    case "appeal.created":
      return `Обращение создано${meta.title ? `: "${meta.title}"` : ""}${meta.plotNumber ? ` (участок: ${meta.plotNumber})` : ""}`;
    
    case "appeal.auto_triage":
      const categoryLabels: Record<string, string> = {
        finance: "Финансы",
        electricity: "Электроэнергия",
        documents: "Документы",
        access: "Доступ",
        membership: "Членство",
        insufficient_data: "Недостаточно данных",
        general: "Общее",
      };
      const category = meta.category ? categoryLabels[meta.category as string] || meta.category : "неизвестная категория";
      return `Автоматически категоризировано как "${category}"${meta.assigneeRole ? `, назначено роли "${roleLabels[meta.assigneeRole as string] || meta.assigneeRole}"` : ""}`;
    
    case "assigned":
    case "appeal.assigned": {
      const to = meta.to as string | undefined;
      const toRole = meta.toRole as string | undefined;
      const autoAssigned = meta.autoAssigned === true;
      const viaRuleAssigned = meta.viaRule === true;
      const ruleNameAssigned = meta.ruleName as string | undefined;
      
      if (viaRuleAssigned && ruleNameAssigned) {
        return `Назначено правилом "${ruleNameAssigned}"${toRole ? ` роли "${roleLabels[toRole] || toRole}"` : ""}`;
      }
      if (autoAssigned) {
        return `Автоматически назначено${toRole ? ` роли "${roleLabels[toRole] || toRole}"` : ""}`;
      }
      if (to && toRole) {
        return `Назначено пользователю ${to} (${roleLabels[toRole] || toRole})`;
      }
      if (toRole) {
        return `Назначено роли "${roleLabels[toRole] || toRole}"`;
      }
      if (to) {
        return `Назначено пользователю ${to}`;
      }
      return "Назначено";
    }
    
    case "unassigned":
    case "appeal.unassigned": {
      const from = meta.from as string | undefined;
      const fromRole = meta.fromRole as string | undefined;
      if (from && fromRole) {
        return `Снято назначение с пользователя ${from} (${roleLabels[fromRole] || fromRole})`;
      }
      if (fromRole) {
        return `Снято назначение с роли "${roleLabels[fromRole] || fromRole}"`;
      }
      if (from) {
        return `Снято назначение с пользователя ${from}`;
      }
      return "Назначение снято";
    }
    
    case "reassigned": {
      const from = meta.from as string | undefined;
      const fromRole = meta.fromRole as string | undefined;
      const to = meta.to as string | undefined;
      const toRole = meta.toRole as string | undefined;
      
      const fromLabel = from
        ? fromRole
          ? `пользователя ${from} (${roleLabels[fromRole] || fromRole})`
          : `пользователя ${from}`
        : fromRole
          ? `роли "${roleLabels[fromRole] || fromRole}"`
          : null;
      
      const toLabel = to
        ? toRole
          ? `пользователю ${to} (${roleLabels[toRole] || toRole})`
          : `пользователю ${to}`
        : toRole
          ? `роли "${roleLabels[toRole] || toRole}"`
          : null;
      
      if (fromLabel && toLabel) {
        return `Передано с ${fromLabel} на ${toLabel}`;
      }
      if (toLabel) {
        return `Передано на ${toLabel}`;
      }
      return "Назначение передано";
    }
    
    case "status_changed":
    case "appeal.status_changed": {
      const oldStatus = meta.oldStatus as string | undefined;
      const newStatus = meta.newStatus as string | undefined;
      const comment = meta.comment as string | undefined;
      const viaRuleStatus = meta.viaRule === true;
      const ruleNameStatus = meta.ruleName as string | undefined;
      
      let statusText = "";
      if (oldStatus && newStatus) {
        statusText = `Статус изменен: "${statusLabels[oldStatus] || oldStatus}" → "${statusLabels[newStatus] || newStatus}"`;
      } else if (newStatus) {
        statusText = `Статус установлен: "${statusLabels[newStatus] || newStatus}"`;
      }
      
      if (viaRuleStatus && ruleNameStatus) {
        return `${statusText} (правило: "${ruleNameStatus}")`;
      }
      if (comment) {
        return `${statusText}. Комментарий: ${comment}`;
      }
      return statusText || "Статус изменен";
    }
    
    case "comment_added": {
      const text = meta.text as string | undefined;
      const commentId = meta.commentId as string | undefined;
      if (text) {
        const preview = text.length > 100 ? `${text.slice(0, 100)}...` : text;
        return `Добавлен комментарий: ${preview}`;
      }
      return "Добавлен комментарий";
    }
    
    case "system_rule_applied": {
      const ruleNameApplied = meta.ruleName as string | undefined;
      const changes = meta.changes as Record<string, unknown> | undefined;
      if (ruleNameApplied) {
        const changeParts: string[] = [];
        if (changes?.assigneeRole) {
          changeParts.push(`назначено роли "${roleLabels[changes.assigneeRole as string] || changes.assigneeRole}"`);
        }
        if (changes?.status) {
          changeParts.push(`статус: "${statusLabels[changes.status as string] || changes.status}"`);
        }
        if (changes?.dueAt) {
          changeParts.push("установлен срок");
        }
        return `Применено правило "${ruleNameApplied}"${changeParts.length > 0 ? `: ${changeParts.join(", ")}` : ""}`;
      }
      return "Применено правило";
    }
    
    case "rule_applied": {
      const ruleNameApplied = meta.ruleName as string | undefined;
      const changes = meta.changes as Record<string, unknown> | undefined;
      if (ruleNameApplied) {
        const changeParts: string[] = [];
        if (changes?.assigneeRole) {
          changeParts.push(`назначено роли "${roleLabels[changes.assigneeRole as string] || changes.assigneeRole}"`);
        }
        if (changes?.status) {
          changeParts.push(`статус: "${statusLabels[changes.status as string] || changes.status}"`);
        }
        if (changes?.dueAt) {
          changeParts.push("установлен срок");
        }
        return `Применено правило "${ruleNameApplied}"${changeParts.length > 0 ? `: ${changeParts.join(", ")}` : ""}`;
      }
      return "Применено правило";
    }
    
    case "due_at_set": {
      const dueAtRuleName = meta.ruleName as string | undefined;
      const dueAt = meta.dueAt as string | undefined;
      if (dueAtRuleName) {
        return `Срок установлен правилом "${dueAtRuleName}"${dueAt ? `: ${new Date(dueAt).toLocaleString("ru-RU")}` : ""}`;
      }
      return dueAt ? `Срок установлен: ${new Date(dueAt).toLocaleString("ru-RU")}` : "Срок установлен";
    }
    
    default:
      return log.action;
  }
}

/**
 * Получает имя актора для отображения
 */
function getActorName(log: ActivityLogEntry): string {
  if (log.actorRole === "system") {
    return "Система";
  }
  if (log.actorRole && roleLabels[log.actorRole]) {
    return roleLabels[log.actorRole];
  }
  if (log.actorUserId) {
    return log.actorUserId;
  }
  return "Неизвестно";
}

export default function AppealActivityFeed({ appealId, logs }: Props) {
  // Инициализируем filter из URL hash при первом рендере
  const [filter, setFilter] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      return hash.includes("filter=system") ? "system" : null;
    }
    return null;
  });

  // Слушаем изменения hash
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash;
      if (newHash.includes("filter=system")) {
        setFilter("system");
      } else {
        setFilter(null);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  
  // Фильтруем логи
  const filteredLogs = filter === "system"
    ? logs.filter((log) => log.action === "system_rule_applied" || log.actorRole === null || log.actorRole === "system")
    : logs;
  
  if (filteredLogs.length === 0) {
    return (
      <div className="space-y-3" data-testid="appeal-activity-root">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">
            {filter === "system" ? "Системные события" : "История активности"}
          </h3>
          {filter === "system" && (
            <button
              onClick={() => {
                setFilter(null);
                window.location.hash = "#activity-feed";
              }}
              className="text-xs text-blue-600 underline hover:text-blue-800"
              data-testid="appeal-activity-clear-filter"
            >
              Показать все события
            </button>
          )}
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600" data-testid="appeal-activity-feed-empty">
          {filter === "system" ? "Системных событий пока нет." : "История активности пока пуста."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="appeal-activity-root">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">
          {filter === "system" ? "Системные события" : "История активности"}
        </h3>
        {filter === "system" && (
          <button
            onClick={() => {
              setFilter(null);
              window.location.hash = "#activity-feed";
            }}
            className="text-xs text-blue-600 underline hover:text-blue-800"
            data-testid="appeal-activity-clear-filter"
          >
            Показать все события
          </button>
        )}
      </div>
      <div className="space-y-2">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            data-testid={`appeal-activity-item-${log.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="text-zinc-900">{formatActivityLogEntry(log)}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                  <span data-testid="appeal-activity-actor">{getActorName(log)}</span>
                  <span>•</span>
                  <span data-testid="appeal-activity-time">
                    {new Date(log.createdAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
