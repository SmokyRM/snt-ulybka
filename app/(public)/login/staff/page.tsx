"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiPostRaw } from "@/lib/api/client";

const roles = [
  { value: "admin", label: "Админ" },
  { value: "chairman", label: "Председатель" },
  { value: "accountant", label: "Бухгалтер" },
  { value: "secretary", label: "Секретарь" },
];

export default function StaffLoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!role || !password) {
      setError("Укажите роль и пароль.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiPostRaw<{ redirectUrl?: string; error?: string }>(
        "/api/auth/login",
        { mode: "staff", roleRu: role, password },
        { credentials: "include" },
      );
      const redirectUrl = data?.redirectUrl || "/office";
      router.push(redirectUrl);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message || "Неверный логин или пароль");
        return;
      }
      setError("Ошибка входа, попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6" data-testid="staff-login-root">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Вход для сотрудников</h1>
        <Link href="/login" className="text-sm font-semibold text-[#5E704F] hover:underline">
          Назад
        </Link>
      </div>
      <p className="text-sm text-zinc-600">Укажите роль и пароль, заданный администратором окружения.</p>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="block space-y-2 text-sm font-medium text-zinc-800">
          Роль
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            data-testid="staff-role-select"
          >
            <option value="">Выберите роль</option>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
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
            data-testid="staff-password"
            placeholder="Введите пароль"
          />
        </label>
        {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <button
          type="submit"
          disabled={loading}
          data-testid="staff-submit"
          className="w-full rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-60"
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </main>
  );
}
