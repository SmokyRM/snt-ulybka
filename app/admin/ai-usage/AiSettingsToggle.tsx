"use client";

import { useState } from "react";

type Props = {
  enabled: boolean;
  canWrite: boolean;
};

export default function AiSettingsToggle({ enabled, canWrite }: Props) {
  const [value, setValue] = useState(enabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (!canWrite || pending) return;
    const next = !value;
    setValue(next);
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        throw new Error("Toggle failed");
      }
      const data = (await res.json()) as { ok?: boolean; enabled?: boolean };
      if (!data.ok) {
        throw new Error("Toggle failed");
      }
      setValue(Boolean(data.enabled));
    } catch {
      setValue(!next);
      setError("Не удалось сохранить настройку.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Расширенный ИИ</p>
          <p className="text-xs text-zinc-500">FAQ работает всегда и бесплатно</p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={!canWrite || pending}
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
            value
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 bg-zinc-50 text-zinc-600"
          } ${!canWrite ? "cursor-not-allowed opacity-60" : "hover:border-[#5E704F]"}`}
        >
          <span>{value ? "Включен" : "Выключен"}</span>
          <span className="inline-flex h-4 w-7 items-center rounded-full bg-white/70 p-0.5">
            <span
              className={`h-3 w-3 rounded-full transition ${
                value ? "translate-x-3 bg-emerald-500" : "translate-x-0 bg-zinc-400"
              }`}
            />
          </span>
        </button>
      </div>
      {!canWrite ? (
        <p className="mt-3 text-xs text-zinc-500">Нет данных: KV не настроен.</p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-zinc-500">{error}</p>
      ) : null}
    </div>
  );
}
