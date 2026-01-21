"use client";

import { useEffect, useMemo, useState } from "react";
import { OnboardingFrame } from "../../../cabinet/_components/OnboardingFrame";
import type { OnboardingDraft } from "../../../cabinet/_components/onboardingState";
import { readOk } from "@/lib/api/client";

const debounceMs = 600;
const isDev = process.env.NODE_ENV !== "production";
type Status = "idle" | "saving" | "saved" | "error";

export default function PlotsForm({ initialDraft }: { initialDraft: OnboardingDraft }) {
  const [plots, setPlots] = useState(
    Array.isArray(initialDraft.plots) && initialDraft.plots.length > 0
      ? initialDraft.plots
      : [],
  );
  const [noPlot, setNoPlot] = useState(Boolean(initialDraft.noPlot));
  const [form, setForm] = useState({ id: "", plotNumber: "", cadastral: "", addressLine: "", isPrimary: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasValidPlots = useMemo(() => noPlot || plots.length > 0, [noPlot, plots]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("saving");
      setSaveError(null);
      try {
        const res = await fetch("/api/cabinet/onboarding/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft: { plots, noPlot },
            step: hasValidPlots ? "consent" : "plots",
          }),
          signal: controller.signal,
        });
        if (isDev) {
          const preview = await res.clone().text();
          console.log("[onboarding-save]", { status: res.status, bodyPreview: preview.slice(0, 200) });
        }
        await readOk(res);
        setStatus("saved");
        setSaveError(null);
      } catch (e) {
        setStatus("error");
        setSaveError(e instanceof Error ? e.message : "Ошибка сети или таймаут");
        if (isDev) {
          console.warn("[onboarding-save] fetch failed", e);
        }
      }
    }, debounceMs);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [plots, noPlot, hasValidPlots]);

  const resetForm = () => {
    setForm({ id: "", plotNumber: "", cadastral: "", addressLine: "", isPrimary: false });
    setEditingId(null);
    setError(null);
  };

  const validate = () => {
    if (!form.plotNumber.trim() && !form.cadastral.trim()) {
      setError("Укажите номер участка или кадастровый номер");
      return false;
    }
    if (form.cadastral && !/^\d{2}:\d{2}:\d{6,7}:\d+$/i.test(form.cadastral.trim())) {
      setError("Кадастровый номер в формате 66:12:345678:12");
      return false;
    }
    const duplicateNumber = form.plotNumber
      ? plots.some((p) => p.id !== editingId && p.plotNumber?.trim() === form.plotNumber.trim())
      : false;
    if (duplicateNumber) {
      setError("Такой номер участка уже добавлен");
      return false;
    }
    const duplicateCad = form.cadastral
      ? plots.some((p) => p.id !== editingId && p.cadastral?.trim() === form.cadastral.trim())
      : false;
    if (duplicateCad) {
      setError("Такой кадастровый номер уже добавлен");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    const nextId = editingId ?? crypto.randomUUID();
    const nextPlots = editingId
      ? plots.map((p) => (p.id === editingId ? { ...p, ...form, id: nextId } : p))
      : [...plots, { ...form, id: nextId }];
    // ensure primary
    const hasPrimary = nextPlots.some((p) => p.isPrimary);
    const normalized = hasPrimary
      ? nextPlots
      : nextPlots.map((p, idx) => ({ ...p, isPrimary: idx === 0 }));
    setPlots(normalized);
    resetForm();
    setNoPlot(false);
  };

  const handleEdit = (id: string) => {
    const target = plots.find((p) => p.id === id);
    if (!target) return;
    setEditingId(id);
    setForm({
      id,
      plotNumber: target.plotNumber ?? "",
      cadastral: target.cadastral ?? "",
      addressLine: target.addressLine ?? "",
      isPrimary: Boolean(target.isPrimary),
    });
    setNoPlot(false);
  };

  const handleDelete = (id: string) => {
    const filtered = plots.filter((p) => p.id !== id);
    setPlots(filtered);
    resetForm();
  };

  const handlePrimary = (id: string) => {
    setPlots((prev) => prev.map((p) => ({ ...p, isPrimary: p.id === id })));
  };

  return (
    <OnboardingFrame
      step="plots"
      title="Участок"
      backHref="/cabinet/onboarding/profile"
      nextHref="/cabinet/onboarding/consent"
      nextStage="consent"
      exitHref="/cabinet"
      disableNext={!hasValidPlots}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-zinc-900">Добавленные участки</div>
          {plots.length === 0 ? (
            <p className="text-sm text-zinc-600">Пока нет участков.</p>
          ) : (
            <div className="space-y-2">
              {plots.map((p) => (
                <div key={p.id} className="flex items-start justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="space-y-1 text-sm text-zinc-800">
                    <div className="font-semibold">
                      {p.plotNumber ? `Участок ${p.plotNumber}` : "Участок"}
                      {p.isPrimary ? " • основной" : ""}
                    </div>
                    {p.cadastral ? <div className="text-xs text-zinc-600">Кадастр: {p.cadastral}</div> : null}
                    {p.addressLine ? <div className="text-xs text-zinc-600">{p.addressLine}</div> : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(p.id)}
                      className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-300"
                    >
                      Удалить
                    </button>
                    {!p.isPrimary ? (
                      <button
                        type="button"
                        onClick={() => handlePrimary(p.id)}
                        className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800 transition hover:border-amber-300"
                      >
                        Сделать основным
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">
            {editingId ? "Редактирование участка" : "Добавить участок"}
          </div>
          <label className="block text-sm font-semibold text-zinc-800">
            Адрес (необязательно)
            <input
              name="addressLine"
              placeholder="Центральная, 12"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={form.addressLine}
              onChange={(e) => setForm((prev) => ({ ...prev, addressLine: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-800">
            Номер участка
            <input
              name="plotNumber"
              placeholder="12"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={form.plotNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, plotNumber: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-800">
            Кадастровый номер
            <input
              name="cadastral"
              placeholder="66:12:345678:12"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={form.cadastral}
              onChange={(e) => setForm((prev) => ({ ...prev, cadastral: e.target.value }))}
            />
          </label>
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
            >
              {editingId ? "Сохранить" : "Добавить"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Отмена
              </button>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={noPlot}
              onChange={(e) => setNoPlot(e.target.checked)}
              className="rounded border-zinc-300"
            />
            <span>Участка пока нет</span>
          </label>
          <StatusBadge status={status} saveError={saveError} />
        </div>
      </div>
    </OnboardingFrame>
  );
}

function StatusBadge({ status, saveError }: { status: Status; saveError?: string | null }) {
  if (status === "saving") return <p className="text-xs text-zinc-500">Сохраняю…</p>;
  if (status === "saved") return <p className="text-xs text-emerald-600">Сохранено</p>;
  if (status === "error") {
    return (
      <p className="text-xs text-rose-600" role="alert">
        Ошибка сохранения{saveError ? `: ${saveError}` : ""}
      </p>
    );
  }
  return null;
}
