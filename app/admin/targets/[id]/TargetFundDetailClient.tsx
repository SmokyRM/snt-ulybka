"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TargetFund } from "@/types/snt";
import { readOk } from "@/lib/api/client";

type Payment = {
  id: string;
  amount: number;
  paidAt: string;
  plotStreet?: string;
  plotNumber?: string;
  ownerFullName?: string | null;
};

type Props = {
  fund: TargetFund & {
    collected: number;
    spent: number;
    remaining: number;
    progressPct: number;
  };
  payments: Payment[];
};

const formatAmount = (n: number) => `${n.toFixed(2)} ₽`;

export default function TargetFundDetailClient({ fund, payments: initialPayments }: Props) {
  const [payments, setPayments] = useState(initialPayments);
  const [unlinkedPayments, setUnlinkedPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const loadUnlinkedPayments = async () => {
    try {
      const res = await fetch("/api/admin/payments/unlinked?limit=50");
      const data = await readOk<{ items: Payment[] }>(res);
      setUnlinkedPayments(data.items || []);
    } catch (e) {
      console.error("Failed to load unlinked payments", e);
    }
  };

  useEffect(() => {
    if (showLinkModal) {
      void loadUnlinkedPayments();
    }
  }, [showLinkModal]);

  const handleLinkPayment = async (paymentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/targets/${fund.id}/link-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      await readOk<{ payment: Payment }>(res);
      // Reload page data
      window.location.reload();
    } catch (e) {
      setError((e as Error).message || "Ошибка привязки платежа");
    } finally {
      setLoading(false);
    }
  };

  const progressPct = Math.min(Math.floor((fund.collected / fund.targetAmount) * 100), 100);

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
        <p className="text-sm text-zinc-700 whitespace-pre-wrap">{fund.description}</p>
        <div className="space-y-2 text-sm text-zinc-800">
          <div>Статус: {fund.status}</div>
          <div>Цель: {formatAmount(fund.targetAmount)}</div>
          <div>Собрано: {formatAmount(fund.collected)}</div>
          <div>Расходы: {formatAmount(fund.spent)}</div>
          <div>Осталось: {formatAmount(fund.remaining)}</div>
          {fund.deadline && (
            <div>Срок: {new Date(fund.deadline).toLocaleDateString("ru-RU")}</div>
          )}
        </div>
        <div className="space-y-1">
          <div className="w-full rounded-full bg-zinc-100">
            <div
              className="rounded-full bg-[#5E704F] text-xs text-white"
              style={{ width: `${progressPct}%`, minWidth: "4%" }}
            >
              &nbsp;
            </div>
          </div>
          <div className="text-xs text-zinc-600">Прогресс: {progressPct}%</div>
        </div>
        <div className="flex gap-2 pt-2">
          <Link
            href={`/admin/targets/${fund.id}/edit`}
            className="rounded border border-[#5E704F] px-3 py-1 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Редактировать
          </Link>
          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            className="rounded border border-zinc-300 px-3 py-1 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Привязать платеж
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold">Привязанные платежи</h2>
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Дата</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-center text-zinc-600" colSpan={3}>
                    Нет привязанных платежей
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2">{new Date(p.paidAt).toLocaleDateString("ru-RU")}</td>
                    <td className="px-3 py-2">
                      {p.plotStreet ? `${p.plotStreet}, ${p.plotNumber}` : p.plotNumber || "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold">{formatAmount(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Привязать платеж к цели</h2>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-zinc-600 hover:text-zinc-900"
              >
                ×
              </button>
            </div>
            <div className="max-h-96 overflow-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Дата</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Сумма</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {unlinkedPayments.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-center text-zinc-600" colSpan={4}>
                        Нет непривязанных платежей
                      </td>
                    </tr>
                  ) : (
                    unlinkedPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2">{new Date(p.paidAt).toLocaleDateString("ru-RU")}</td>
                        <td className="px-3 py-2">
                          {p.plotStreet ? `${p.plotStreet}, ${p.plotNumber}` : p.plotNumber || "—"}
                        </td>
                        <td className="px-3 py-2 font-semibold">{formatAmount(p.amount)}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => void handleLinkPayment(p.id)}
                            disabled={loading}
                            className="rounded bg-[#5E704F] px-2 py-1 text-xs font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
                          >
                            Привязать
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
