"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession, saveSession } from "@/lib/session";

const MAGIC_CODE = "111111";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      router.replace("/cabinet");
    }
  }, [router]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!identifier) {
      setError("Укажите email или телефон.");
      return;
    }
    if (code !== MAGIC_CODE) {
      setError("Неверный код. Используйте 111111 для входа.");
      return;
    }
    saveSession(identifier);
    router.push("/cabinet");
  };

  const handleSendCode = () => {
    if (!identifier) {
      setError("Сначала укажите email или телефон.");
      return;
    }
    setError(null);
    setInfo("Код отправлен (MVP: используйте 111111).");
  };

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Вход</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Введите email и код подтверждения (MVP: код 111111).
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-800">
              Email или телефон
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-800">
              Код подтверждения
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="111111"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
            />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              {info}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSendCode}
              className="rounded-full border border-[#5E704F] px-5 py-2.5 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
            >
              Получить код
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Войти
            </button>
          </div>
        </form>
        <p className="mt-6 text-xs text-zinc-500">
          После входа можно подать заявку на подтверждение участка.
        </p>
      </div>
    </main>
  );
}
