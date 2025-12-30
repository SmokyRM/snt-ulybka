"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Item = {
  plotId: string;
  street: string;
  number: string;
  ownerName: string;
  amountAccrued: number;
  amountPaid: number;
  debt: number;
  text: string;
  notificationStatus?: "new" | "notified" | "resolved";
  notificationComment?: string | null;
  periodId?: string;
};

type ResponseData = { ok?: boolean; items?: Item[]; error?: string; count?: number };

const buildQuery = (nextType: string, nextPeriod: string) => {
  const sp = new URLSearchParams();
  if (nextType) sp.set("type", nextType);
  if (nextPeriod) sp.set("period", nextPeriod);
  return sp.toString();
};

const safeJson = async (
  res: Response
): Promise<{ ok: boolean; data: ResponseData; raw: string }> => {
  const raw = await res.text();
  if (!raw) {
    return { ok: false, data: { ok: false, error: "Empty response" }, raw: "" };
  }
  try {
    return { ok: true, data: JSON.parse(raw) as ResponseData, raw };
  } catch (parseError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[debtors] invalid json response", { status: res.status, raw, parseError });
    }
    return { ok: false, data: { ok: false, error: "Invalid JSON" }, raw };
  }
};

export default function DebtorsClient() {
  const searchParams = useSearchParams();
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const initialType =
    (searchParams.get("type") as "membership" | "electricity" | null) ?? "membership";
  const initialPeriod = searchParams.get("period") ?? defaultPeriod;

  const [type, setType] = useState<"membership" | "electricity">(initialType);
  const [period, setPeriod] = useState<string>(initialPeriod);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideResolved, setHideResolved] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState("");
  const editingRef = useRef(false);
  const lastAppliedRef = useRef<string | null>(null);

  const load = useCallback(async (nextType: string, nextPeriod: string) => {
    const query = buildQuery(nextType, nextPeriod);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/notifications/debtors?${query}`, {
        cache: "no-store",
      });
      const { ok, data, raw } = await safeJson(res);
      if (!ok || !res.ok || data.ok === false || data.error) {
        if (process.env.NODE_ENV !== "production" && !ok) {
          console.warn("[debtors] load failed", { status: res.status, raw });
        }
        setError(data.error ?? "Ошибка загрузки. Попробуйте обновить страницу.");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
      lastAppliedRef.current = query;
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const nextType =
      (searchParams.get("type") as "membership" | "electricity" | null) ?? "membership";
    const nextPeriod = searchParams.get("period") ?? defaultPeriod;
    const nextQuery = buildQuery(nextType, nextPeriod);
    if (lastAppliedRef.current === nextQuery && !editingRef.current) return;
    editingRef.current = false;
    setType(nextType);
    setPeriod(nextPeriod);
    load(nextType, nextPeriod);
  }, [defaultPeriod, load, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = window.sessionStorage.getItem("assistant.draft.debtorsMessage");
    if (draft) {
      setAssistantDraft(draft);
    }
  }, []);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Не удалось скопировать текст");
    }
  };

  const exportCsv = () => {
    window.location.href = `/api/admin/notifications/debtors/export.csv?type=${type}&period=${period}`;
  };

  const markStatus = async (item: Item, status: "notified" | "resolved", comment?: string) => {
    if (!item.periodId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications/debtors/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plotId: item.plotId,
          periodId: item.periodId,
          type,
          status,
          debtAmount: item.debt,
          comment,
        }),
      });
      if (!res.ok) {
        const { ok, data, raw } = await safeJson(res);
        if (process.env.NODE_ENV !== "production" && !ok) {
          console.warn("[debtors] mark status failed", { status: res.status, raw });
        }
        setError(data.error ?? "Не удалось обновить статус");
        return;
      }
      await load(type, period);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = hideResolved ? items.filter((i) => i.notificationStatus !== "resolved") : items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="text-sm text-zinc-700">
          Тип
            <select
              value={type}
              onChange={(e) => {
                editingRef.current = true;
                setType(e.target.value as "membership" | "electricity");
              }}
              className="mt-1 w-48 rounded border border-zinc-300 px-3 py-2 text-sm"
            >
            <option value="membership">Членские взносы</option>
            <option value="electricity">Электроэнергия</option>
          </select>
        </label>
        <label className="text-sm text-zinc-700">
          Период (YYYY-MM)
            <input
              type="text"
              value={period}
              onChange={(e) => {
                editingRef.current = true;
                setPeriod(e.target.value);
              }}
              className="mt-1 w-32 rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="2025-01"
            />
        </label>
        <button
          type="button"
          onClick={() => load(type, period)}
          disabled={loading}
          className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          Применить фильтры
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
        >
          Экспорт CSV
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = `/api/admin/notifications/debtors/pdf?type=${type}&period=${period}`;
          }}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
        >
          Скачать PDF
        </button>
        <button
          type="button"
          disabled={loading || filteredItems.length === 0}
          onClick={async () => {
            if (filteredItems.length === 0) {
              setError("Нет должников за выбранный период");
              return;
            }
            setLoading(true);
            setError(null);
            try {
              const res = await fetch("/api/admin/notifications/debtors/send-telegram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, period }),
              });
              const raw = await res.text();
              if (!raw) {
                if (!res.ok) {
                  if (process.env.NODE_ENV !== "production") {
                    console.warn("[debtors] telegram export empty response", { status: res.status });
                  }
                  setError("Не удалось отправить в Telegram");
                }
                return;
              }
              let data: { ok?: boolean; error?: string } = {};
              try {
                data = JSON.parse(raw) as { ok?: boolean; error?: string };
              } catch (parseError) {
                if (process.env.NODE_ENV !== "production") {
                  console.warn("[debtors] telegram export invalid json", { status: res.status, raw, parseError });
                }
                setError("Получен некорректный ответ сервера");
                return;
              }
              if (!res.ok || data.ok === false) {
                setError(data.error ?? "Не удалось отправить в Telegram");
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setLoading(false);
            }
          }}
          className="rounded border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400 disabled:hover:bg-transparent"
        >
          Отправить в Telegram
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={hideResolved}
            onChange={(e) => setHideResolved(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Скрыть закрытые
        </label>
        {loading && <span className="text-sm text-zinc-600">Загрузка...</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>

      {assistantDraft ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Найден черновик уведомления из помощника</p>
          <p className="text-xs text-amber-800">
            Можно вставить его в поле текста уведомления или отказаться.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setNotificationMessage(assistantDraft);
                window.sessionStorage.removeItem("assistant.draft.debtorsMessage");
                setAssistantDraft(null);
              }}
              className="rounded bg-[#5E704F] px-3 py-1 text-xs font-semibold text-white"
            >
              Вставить
            </button>
            <button
              type="button"
              onClick={() => {
                window.sessionStorage.removeItem("assistant.draft.debtorsMessage");
                setAssistantDraft(null);
              }}
              className="rounded border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-900"
            >
              Отменить
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="text-sm text-zinc-700">
          Текст уведомления
          <textarea
            value={notificationMessage}
            onChange={(event) => setNotificationMessage(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Подготовьте текст уведомления для копирования..."
          />
        </label>
        {notificationMessage ? (
          <button
            type="button"
            onClick={() => copyText(notificationMessage)}
            className="mt-2 rounded border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Скопировать текст
          </button>
        ) : null}
      </div>

      <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-зinc-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Улица</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Участок</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">ФИО</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Начислено</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Оплачено</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Долг</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Статус</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Текст уведомления</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-зinc-100">
            {filteredItems.map((item) => (
              <tr key={item.plotId} className={item.debt > 0 ? "bg-red-50/40" : undefined}>
                <td className="px-3 py-2">{item.street}</td>
                <td className="px-3 py-2">{item.number}</td>
                <td className="px-3 py-2">{item.ownerName}</td>
                <td className="px-3 py-2">{item.amountAccrued.toFixed(2)}</td>
                <td className="px-3 py-2">{item.amountPaid.toFixed(2)}</td>
                <td className="px-3 py-2">{item.debt.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1 text-xs">
                    <span>
                      {item.notificationStatus === "resolved"
                        ? "Закрыто"
                        : item.notificationStatus === "notified"
                          ? "Уведомлён"
                          : "Новый"}
                    </span>
                    {item.notificationComment && <span className="text-zinc-600">{item.notificationComment}</span>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-zinc-300 px-2 py-1 hover:bg-зinc-100"
                        onClick={() => markStatus(item, "notified")}
                        disabled={loading}
                      >
                        Отметить уведомлён
                      </button>
                      <button
                        type="button"
                        className="rounded border border-zinc-300 px-2 py-1 hover:bg-зinc-100"
                        onClick={() => markStatus(item, "resolved")}
                        disabled={loading}
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 max-w-xl">
                  <div className="flex items-start gap-2">
                    <span className="flex-1 text-xs sm:text-sm">{item.text}</span>
                    <button
                      type="button"
                      onClick={() => copyText(item.text)}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-зinc-100"
                    >
                      Скопировать
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-зinc-600" colSpan={7}>
                  Нет должников за указанный период.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
