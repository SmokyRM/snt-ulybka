"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";
import OfficeLoadingState from "../_components/OfficeLoadingState";
import OfficeErrorState from "../_components/OfficeErrorState";
import OfficeEmptyState from "../_components/OfficeEmptyState";
import AppLink from "@/components/AppLink";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
};

export default function TasksClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ tasks: Task[] }>("/api/office/tasks");
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить поручения");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createTask = async () => {
    if (!title.trim()) return;
    try {
      await apiPost("/api/office/tasks", { title: title.trim() });
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать поручение");
    }
  };

  if (loading) return <OfficeLoadingState message="Загрузка поручений..." testId="office-tasks-loading" />;
  if (error) return <OfficeErrorState message={error} testId="office-tasks-error" />;
  if (!tasks.length) {
    return <OfficeEmptyState message="Поручений нет." testId="office-tasks-empty" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Новое поручение</div>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            type="button"
            onClick={createTask}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white"
          >
            Создать
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Список поручений</div>
        <div className="mt-3 space-y-2 text-sm text-zinc-700">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-zinc-900">{task.title}</div>
                <div className="text-xs text-zinc-500">Статус: {task.status}</div>
              </div>
              <AppLink href={`/office/tasks/${task.id}`} className="text-[#5E704F] text-xs font-semibold">
                Открыть
              </AppLink>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
