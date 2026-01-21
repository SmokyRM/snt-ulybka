"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAppRouter } from "@/hooks/useAppRouter";
import { getSessionClient } from "@/lib/session";
import { ApiError, apiPostRaw } from "@/lib/api/client";

export default function RegisterPlotPage() {
  const router = useAppRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const session = getSessionClient();
    if (session) {
      const contact = session.contact;
      if (contact && contact.includes("@")) {
        setSessionEmail(contact);
      }
      setHasSession(true);
      // проверяем, есть ли участок у пользователя
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user?.plotNumber) {
            router.replace("/cabinet");
          }
        })
        .catch(() => undefined)
        .finally(() => setSessionReady(true));
    } else {
      router.replace("/login");
    }
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
    plotCode: "",
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!hasSession) {
      setError("Сначала выполните вход.");
      return;
    }
    if (!form.plotNumber || !form.street || !form.fullName || !form.phone || !form.plotCode) {
      setError("Заполните обязательные поля и код участка.");
      return;
    }
    if (!form.consentPD || !form.acceptedCharter) {
      setError("Подтвердите согласия.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPostRaw(
        "/api/plots/register",
        {
          plotNumber: form.plotNumber,
          street: form.street,
          cadastral: form.cadastral,
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          plotCode: form.plotCode,
          consentPD: form.consentPD,
          acceptedCharter: form.acceptedCharter,
        },
      );
      router.push("/cabinet");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Не удалось отправить заявку.");
      } else {
        setError(err instanceof Error ? err.message : "Не удалось отправить заявку.");
      }
    } finally {
      setSubmitting(false);
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
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-[#5E704F]">
          <Link href="/cabinet" className="hover:underline">
            ← В кабинет
          </Link>
          <Link href="/" className="hover:underline">
            На главную
          </Link>
        </div>
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
                Улица *
              </label>
              <input
                name="street"
                required
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
                minLength={5}
                value={form.phone}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
                placeholder="+7 900 000-00-00"
              />
              <p className="text-xs text-zinc-500">Укажите номер, чтобы мы смогли связаться. Минимум 5 символов.</p>
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
                Код участка *
              </label>
              <input
                name="plotCode"
                required
                value={form.plotCode}
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
              disabled={submitting}
              className="w-full rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Отправка..." : "Отправить заявку"}
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
