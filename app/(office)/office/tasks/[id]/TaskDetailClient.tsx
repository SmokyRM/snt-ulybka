"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
};

type Update = {
  id: string;
  message: string;
  statusTo: string | null;
  createdAt: string;
};

export default function TaskDetailClient({ taskId }: { taskId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [status, setStatus] = useState("todo");
  const [comment, setComment] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ task: Task; updates: Update[] }>(`/api/office/tasks/${taskId}`);
      setTask(data.task);
      setUpdates(data.updates);
      setStatus(data.task.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить поручение");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [taskId]);

  const saveStatus = async () => {
    try {
      await apiPost(`/api/office/tasks/${taskId}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось обновить статус");
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    try {
      await apiPost(`/api/office/tasks/${taskId}/comment`, { message: comment.trim(), statusTo: status });
      setComment("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось добавить комментарий");
    }
  };

  if (loading) return <OfficeLoadingState message="Загрузка поручения..." testId="office-task-loading" />;
  if (error) return <OfficeErrorState message={error} testId="office-task-error" />;
  if (!task) return <OfficeErrorState message="Поручение не найдено" testId="office-task-missing" />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">{task.title}</h1>
        {task.description && <p className="text-sm text-zinc-600">{task.description}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-zinc-200 px-3 py-2"
          >
            <option value="todo">К выполнению</option>
            <option value="in_progress">В работе</option>
            <option value="blocked">Заблокировано</option>
            <option value="done">Готово</option>
            <option value="cancelled">Отменено</option>
          </select>
          <button
            type="button"
            onClick={saveStatus}
            className="rounded bg-[#5E704F] px-3 py-2 text-sm font-semibold text-white"
          >
            Сохранить статус
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Обновления</div>
        <div className="mt-3 space-y-2 text-sm text-zinc-700">
          {updates.map((update) => (
            <div key={update.id} className="rounded border border-zinc-200 p-2">
              <div>{update.message}</div>
              <div className="text-xs text-zinc-500">{update.statusTo ?? ""}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Комментарий"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            type="button"
            onClick={addComment}
            className="rounded border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}
