"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPerson } from "@/lib/registry/core";
import { listPlots } from "@/lib/registry/core";
import { ApiError, apiPost } from "@/lib/api/client";

interface RegisterClientProps {
  code: string;
  personId: string;
}

export default function RegisterClient({ code, personId }: RegisterClientProps) {
  const router = useRouter();
  const [person, setPerson] = useState<{ fullName: string; phone?: string | null; email?: string | null; plots: Array<{ plotNumber: string; sntStreetNumber: string }> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPersonData();
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  const loadPersonData = async () => {
    try {
      const personData = getPerson(personId);
      if (!personData) {
        setError("Данные не найдены");
        return;
      }

      const plots = listPlots({ personId });
      setPerson({
        fullName: personData.fullName,
        phone: personData.phone,
        email: personData.email,
        plots: plots.map((p) => ({ plotNumber: p.plotNumber, sntStreetNumber: p.sntStreetNumber })),
      });

      // Pre-fill form with person data
      setFormData((prev) => ({
        ...prev,
        phone: personData.phone || "",
        email: personData.email || "",
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (formData.password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }

    setRegistering(true);

    try {
      const data = await apiPost<{ userId: string }>(
        "/api/auth/register",
        {
          code,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          personId,
        },
      );
      if (data.userId) {
        router.push("/cabinet?registered=true");
        return;
      }
      setError("Ошибка регистрации");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message || "Ошибка регистрации");
        return;
      }
      setError((e as Error).message || "Ошибка сети");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F1E9] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm text-center">
          <div className="text-sm text-zinc-600">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F1E9] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h1 className="mb-4 text-xl font-semibold text-red-900">Ошибка</h1>
          <p className="text-sm text-red-700">{error || "Данные не найдены"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F1E9] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-zinc-900">Регистрация</h1>
        <p className="mb-6 text-sm text-zinc-600">
          Здравствуйте, {person.fullName}! Заполните данные для завершения регистрации.
        </p>

        {person.plots.length > 0 && (
          <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-2 text-sm font-semibold text-zinc-700">Ваши участки:</div>
            <ul className="space-y-1 text-sm text-zinc-600">
              {person.plots.map((plot, idx) => (
                <li key={idx}>
                  Линия {plot.sntStreetNumber}, участок {plot.plotNumber}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Телефон *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              required
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Пароль *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              required
              minLength={6}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Не менее 6 символов"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Подтвердите пароль *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              required
              minLength={6}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Повторите пароль"
            />
          </div>

          <button
            type="submit"
            disabled={registering}
            className="w-full rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {registering ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>

        <p className="mt-4 text-xs text-zinc-500">
          После регистрации ваш аккаунт будет иметь статус &quot;ожидает подтверждения&quot; до проверки администратором.
        </p>
      </div>
    </div>
  );
}
