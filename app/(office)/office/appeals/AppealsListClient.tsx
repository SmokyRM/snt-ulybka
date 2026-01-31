"use client";

import { useMemo, useState } from "react";
import AppLink from "@/components/AppLink";
import { apiPost, ApiError } from "@/lib/api/client";
import type { Appeal, AppealStatus } from "@/lib/office/types";

const statusLabels: Record<AppealStatus, string> = {
  new: "Новое",
  in_progress: "В работе",
  needs_info: "Требует уточнения",
  closed: "Закрыто",
};

const statusClass: Record<AppealStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  needs_info: "bg-orange-100 text-orange-800",
  closed: "bg-emerald-100 text-emerald-800",
};

// Sprint 34: Check if appeal is overdue
function isOverdue(appeal: Appeal): boolean {
  if (appeal.status === "closed") return false;
  if (!appeal.dueAt) return false;
  return new Date(appeal.dueAt) < new Date();
}

// Sprint 34: Format due date
function formatDueDate(dueAt: string | null | undefined): string {
  if (!dueAt) return "—";
  const date = new Date(dueAt);
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type Props = {
  appeals: Appeal[];
  staffUsers?: { id: string; name: string; role: string }[];
};

export default function AppealsListClient({ appeals, staffUsers = [] }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"new" | "in_progress" | "closed">("in_progress");
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const toggleAll = () => {
    if (selectedIds.length === appeals.length) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    appeals.forEach((appeal) => {
      next[appeal.id] = true;
    });
    setSelected(next);
  };

  const handleBulkStatus = async () => {
    if (!selectedIds.length) return;
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/office/appeals/bulk-status", { ids: selectedIds, status });
      window.location.reload();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Ошибка массового обновления";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Sprint 34: Bulk assign
  const handleBulkAssign = async () => {
    if (!selectedIds.length || !assignUserId) return;
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/office/appeals/bulk-assign", { ids: selectedIds, assigneeUserId: assignUserId });
      window.location.reload();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Ошибка массового назначения";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 grid gap-3" data-testid="office-appeals-list">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
        <span className="text-xs font-semibold text-zinc-600">Выбрано: {selectedIds.length}</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700"
          data-testid="office-appeals-bulk-status"
        >
          <option value="new">Новое</option>
          <option value="in_progress">В работе</option>
          <option value="closed">Закрыто</option>
        </select>
        <button
          type="button"
          onClick={() => void handleBulkStatus()}
          className="rounded-md bg-[#5E704F] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          disabled={!selectedIds.length || loading}
        >
          Применить статус
        </button>
        {/* Sprint 34: Bulk assign */}
        <select
          value={assignUserId}
          onChange={(e) => setAssignUserId(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700"
          data-testid="office-appeals-bulk-assign"
        >
          <option value="">Назначить...</option>
          {staffUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.role})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void handleBulkAssign()}
          className="rounded-md bg-[#5E704F] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          disabled={!selectedIds.length || !assignUserId || loading}
        >
          Назначить
        </button>
        <button
          type="button"
          onClick={toggleAll}
          className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
        >
          {selectedIds.length === appeals.length ? "Снять все" : "Выбрать все"}
        </button>
        {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      </div>

      {appeals.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600"
          data-testid="office-appeals-empty"
        >
          Обращений по выбранным фильтрам пока нет.
        </div>
      ) : (
        appeals.map((appeal) => (
          <div
            key={appeal.id}
            className={`flex flex-col gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm ${
              isOverdue(appeal) ? "border-rose-300" : "border-zinc-200"
            }`}
            data-testid={`office-appeals-item-${appeal.id}`}
          >
            <span className="sr-only" data-testid="office-appeals-row" />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(selected[appeal.id])}
                onChange={(e) => setSelected((prev) => ({ ...prev, [appeal.id]: e.target.checked }))}
                className="rounded border-zinc-300"
              />
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass[appeal.status]}`}>
                {statusLabels[appeal.status]}
              </span>
              {/* Sprint 34: Overdue badge */}
              {isOverdue(appeal) && (
                <span
                  className="inline-flex items-center rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700"
                  data-testid="office-appeals-overdue-badge"
                >
                  Просрочено
                </span>
              )}
              <span className="text-xs text-zinc-500">
                Обновлено {new Date(appeal.updatedAt).toLocaleDateString("ru-RU")}
              </span>
            </div>
            <AppLink
              href={`/office/appeals/${appeal.id}`}
              className="text-base font-semibold text-zinc-900 hover:underline"
            >
              {appeal.title}
            </AppLink>
            <div className="text-sm text-zinc-600 line-clamp-2">{appeal.body}</div>
            <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
              {appeal.plotNumber ? <span>Участок: {appeal.plotNumber}</span> : null}
              {appeal.authorName ? <span>Автор: {appeal.authorName}</span> : null}
              {/* Sprint 34: Assignee */}
              <span data-testid="office-appeals-assign">
                Исполнитель: {appeal.assignedToUserId ?? appeal.assigneeRole ?? "—"}
              </span>
              {/* Sprint 34: Due date */}
              <span data-testid="office-appeals-due">
                Срок: {formatDueDate(appeal.dueAt)}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
