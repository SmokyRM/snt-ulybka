"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { sanitizeNextUrl } from "@/lib/sanitizeNextUrl";
import { ApiError, apiPostRaw } from "@/lib/api/client";

const roleOptions = [
  { value: "admin", label: "Админ" },
  { value: "chairman", label: "Председатель" },
  { value: "accountant", label: "Бухгалтер" },
  { value: "secretary", label: "Секретарь" },
];

export default function StaffLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sanitizedNext = useMemo(() => {
    const raw = searchParams?.get("next") ?? null;
    return sanitizeNextUrl(raw);
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!role || !password.trim()) {
      setError("Укажите роль и пароль.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiPostRaw<{ redirectTo?: string }>(
        "/api/auth/staff-login",
        { login: role, password, next: sanitizedNext ?? "" },
        { credentials: "include" },
      );
      const redirectToRaw = data?.redirectTo || "/office";
      const redirectTo = sanitizeNextUrl(redirectToRaw) ?? "/office";
      router.push(redirectTo);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message || "Неверный логин или пароль.");
        return;
      }
      setError("Ошибка входа. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6" data-testid="staff-login-form">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Вход для сотрудников</h1>
        <Link href="/login" className="text-sm font-semibold text-[#5E704F] hover:underline">
          Назад
        </Link>
      </div>
      <p className="text-sm text-zinc-600">Укажите роль и пароль, выданные администратором.</p>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="block space-y-2 text-sm font-medium text-zinc-800">
          Роль
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            data-testid="staff-login-username"
          >
            <option value="">Выберите роль</option>
            {roleOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2 text-sm font-medium text-zinc-800">
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            data-testid="staff-login-password"
            placeholder="Введите пароль"
          />
        </label>
        {error ? (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="staff-login-error">
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          data-testid="staff-login-submit"
          className="w-full rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-60"
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </main>
  );
}
