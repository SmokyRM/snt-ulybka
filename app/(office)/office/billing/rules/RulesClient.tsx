"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";
import OfficeErrorState from "../../_components/OfficeErrorState";

type FeeRule = {
  id: string;
  name: string;
  periodFrom: string | null;
  periodTo: string | null;
  appliesTo: "all" | "street" | "plot" | "tag";
  selector: Record<string, unknown>;
  calcType: "flat" | "per_area" | "per_kwh" | "custom";
  amount: number;
  isActive: boolean;
};

type RulesResponse = {
  rules: FeeRule[];
};

const toCsvList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function RulesClient() {
  const [rules, setRules] = useState<FeeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    periodFrom: "",
    periodTo: "",
    appliesTo: "all",
    plotIds: "",
    streets: "",
    calcType: "flat",
    amount: "",
    isActive: true,
  });

  const mode = form.id ? "edit" : "create";

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<RulesResponse>("/api/office/billing/fee-rules");
      setRules(data.rules);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось загрузить правила";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRules();
  }, []);

  const selector = useMemo(() => {
    if (form.appliesTo === "plot") {
      return { plotIds: toCsvList(form.plotIds) };
    }
    if (form.appliesTo === "street") {
      return { streets: toCsvList(form.streets) };
    }
    return {};
  }, [form.appliesTo, form.plotIds, form.streets]);

  const resetForm = () => {
    setForm({
      id: "",
      name: "",
      periodFrom: "",
      periodTo: "",
      appliesTo: "all",
      plotIds: "",
      streets: "",
      calcType: "flat",
      amount: "",
      isActive: true,
    });
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setError("Введите название правила");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount)) {
      setError("Сумма должна быть числом");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/office/billing/fee-rules", {
        id: form.id || null,
        name: form.name.trim(),
        periodFrom: form.periodFrom || null,
        periodTo: form.periodTo || null,
        appliesTo: form.appliesTo,
        selector,
        calcType: form.calcType,
        amount,
        isActive: form.isActive,
      });
      await loadRules();
      resetForm();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось сохранить правило";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const editRule = (rule: FeeRule) => {
    setForm({
      id: rule.id,
      name: rule.name,
      periodFrom: rule.periodFrom ?? "",
      periodTo: rule.periodTo ?? "",
      appliesTo: rule.appliesTo,
      plotIds: Array.isArray(rule.selector?.plotIds) ? rule.selector.plotIds.join(", ") : "",
      streets: Array.isArray(rule.selector?.streets) ? rule.selector.streets.join(", ") : "",
      calcType: rule.calcType,
      amount: String(rule.amount),
      isActive: rule.isActive,
    });
  };

  const removeRule = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/office/billing/fee-rules", { id, remove: true, name: "remove" });
      await loadRules();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось удалить правило";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <OfficeLoadingState message="Загрузка правил..." testId="office-billing-rules-loading" />;
  }

  if (error) {
    return <OfficeErrorState message={error} testId="office-billing-rules-error" />;
  }

  if (!rules.length) {
    return (
      <div className="space-y-4">
        <OfficeEmptyState message="Пока нет правил начислений." testId="office-billing-rules-empty" />
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Новое правило</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Название"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Сумма"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="mt-3 rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#536443] disabled:opacity-50"
          >
            Сохранить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">
          {mode === "edit" ? "Редактирование правила" : "Новое правило"}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Название"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Сумма"
            value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Период с (YYYY-MM)"
            value={form.periodFrom}
            onChange={(event) => setForm((prev) => ({ ...prev, periodFrom: event.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Период по (YYYY-MM)"
            value={form.periodTo}
            onChange={(event) => setForm((prev) => ({ ...prev, periodTo: event.target.value }))}
          />
          <select
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.appliesTo}
            onChange={(event) => setForm((prev) => ({ ...prev, appliesTo: event.target.value }))}
          >
            <option value="all">Все участки</option>
            <option value="street">По линии</option>
            <option value="plot">По участкам</option>
          </select>
          <select
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.calcType}
            onChange={(event) => setForm((prev) => ({ ...prev, calcType: event.target.value }))}
          >
            <option value="flat">Фиксированная</option>
            <option value="per_area">За площадь</option>
            <option value="per_kwh">За кВт⋅ч</option>
            <option value="custom">Индивидуальная</option>
          </select>
          {form.appliesTo === "plot" && (
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm md:col-span-2"
              placeholder="ID участков через запятую"
              value={form.plotIds}
              onChange={(event) => setForm((prev) => ({ ...prev, plotIds: event.target.value }))}
            />
          )}
          {form.appliesTo === "street" && (
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm md:col-span-2"
              placeholder="Номера линий через запятую"
              value={form.streets}
              onChange={(event) => setForm((prev) => ({ ...prev, streets: event.target.value }))}
            />
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Активно
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#536443] disabled:opacity-50"
          >
            {mode === "edit" ? "Сохранить" : "Создать"}
          </button>
          {mode === "edit" && (
            <button
              type="button"
              disabled={saving}
              onClick={resetForm}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
            >
              Отмена
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Список правил</div>
        <div className="mt-3 space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-zinc-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-zinc-900">{rule.name}</div>
                  <div className="text-xs text-zinc-500">
                    {rule.periodFrom ?? "—"} → {rule.periodTo ?? "—"} · {rule.calcType} · {rule.appliesTo}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-300"
                    onClick={() => editRule(rule)}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300"
                    onClick={() => removeRule(rule.id)}
                    disabled={saving}
                  >
                    Удалить
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-zinc-600">
                Сумма: {rule.amount} · Активно: {rule.isActive ? "да" : "нет"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
