"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/lib/session";
import {
  getPlotByNumber,
  isPlotOccupied,
  submitOwnershipRequest,
} from "@/lib/mockDb";

export default function RegisterPlotPage() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      if (session.identifier.includes("@")) {
        setSessionEmail(session.identifier);
      }
      setHasSession(true);
    }
    if (!session) {
      router.replace("/login");
      return;
    }
    setSessionReady(true);
  }, [router]);

  useEffect(() => {
    if (sessionEmail) {
      setForm((prev) => ({ ...prev, email: sessionEmail }));
    }
  }, [sessionEmail]);

  const [form, setForm] = useState({
    plotNumber: "",
    street: "",
    cadastral: "",
    fullName: "",
    phone: "",
    email: sessionEmail ?? "",
    addressForNotices: "",
    consentPD: false,
    acceptedCharter: false,
  });

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const el = event.currentTarget;
    const { name, value, type } = el;
    const nextValue =
      type === "checkbox"
        ? (el as HTMLInputElement).checked
        : value;
    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!hasSession) {
      setError("Сначала выполните вход.");
      return;
    }
    if (!form.plotNumber || !form.fullName || !form.phone) {
      setError("Заполните обязательные поля.");
      return;
    }
    if (!form.consentPD || !form.acceptedCharter) {
      setError("Подтвердите согласия.");
      return;
    }
    try {
      const plot = getPlotByNumber(form.plotNumber);
      if (!plot) {
        setError("Указанный участок не найден в реестре.");
        return;
      }
      if (isPlotOccupied(form.plotNumber)) {
        setError("Участок уже подтвержден за другим пользователем.");
        return;
      }
      submitOwnershipRequest({
        plotNumber: form.plotNumber,
        street: form.street,
        cadastral: form.cadastral,
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || undefined,
        addressForNotices: form.addressForNotices,
        consentPD: form.consentPD,
        acceptedCharter: form.acceptedCharter,
      });
      router.push("/cabinet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить заявку.");
    }
  };

  if (!sessionReady) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-zinc-700">Загрузка...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Регистрация участка</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Укажите данные участка и свои контакты. После проверки администратор
          подтвердит доступ.
        </p>
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800">
                Номер участка *
              </label>
              <input
                name="plotNumber"
                required
                value={form.plotNumber}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800">
                Улица (необязательно)
              </label>
              <input
                name="street"
                value={form.street}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800">
                Кадастровый номер (необязательно)
              </label>
              <input
                name="cadastral"
                value={form.cadastral}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800">
                ФИО *
              </label>
              <input
                name="fullName"
                required
                value={form.fullName}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800">
                Телефон *
              </label>
              <input
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800">
                Email (необязательно)
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800">
                Адрес для уведомлений (необязательно)
              </label>
              <input
                name="addressForNotices"
                value={form.addressForNotices}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl bg-[#5E704F]/5 p-4">
            <label className="flex items-start gap-3 text-sm text-zinc-800">
              <input
                type="checkbox"
                name="consentPD"
                checked={form.consentPD}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#5E704F] focus:ring-[#5E704F]"
              />
              <span>Согласен на обработку персональных данных *</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-zinc-800">
              <input
                type="checkbox"
                name="acceptedCharter"
                checked={form.acceptedCharter}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#5E704F] focus:ring-[#5E704F]"
              />
              <span>Ознакомлен с уставом СНТ *</span>
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="w-full rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] sm:w-auto"
            >
              Отправить заявку
            </button>
            <p className="text-xs text-zinc-500">
              После отправки статус можно отслеживать в кабинете.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
