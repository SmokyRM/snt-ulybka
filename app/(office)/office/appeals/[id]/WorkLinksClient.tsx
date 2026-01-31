"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";

type WorkItem = { id: string; title: string };

export default function WorkLinksClient({ appealId }: { appealId: string }) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [workId, setWorkId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ items: WorkItem[] }>(`/api/office/works?appealId=${appealId}`);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки работ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [appealId]);

  const link = async (action: "link" | "unlink", id: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/api/office/works/${id}/link-appeal`, { appealId, action });
      setWorkId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка связи");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-zinc-900">Связанные работы</div>
      {error && <div className="mt-2 text-xs text-rose-600">{error}</div>}
      {items.length === 0 && !loading ? (
        <div className="mt-2 text-sm text-zinc-600">Пока нет связей.</div>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div>{item.title}</div>
              <button
                type="button"
                onClick={() => link("unlink", item.id)}
                className="text-xs text-rose-600"
                data-testid="office-work-link-appeal"
              >
                Отвязать
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <input
          value={workId}
          onChange={(e) => setWorkId(e.target.value)}
          placeholder="ID работы"
          className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={() => workId && link("link", workId)}
          className="rounded border border-zinc-200 px-2 py-1 text-xs"
          data-testid="office-work-link-appeal"
        >
          Связать
        </button>
      </div>
    </div>
  );
}
