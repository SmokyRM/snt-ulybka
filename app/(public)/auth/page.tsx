"use client";

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white/90 p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
          Доступ в кабинет
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Личный кабинет СНТ «Улыбка»
        </h1>
        <p className="mt-2 text-sm text-zinc-700">
          Доступ только для правообладателей и членов СНТ после подтверждения
          данных.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="/login"
            className="rounded-full bg-[#5E704F] px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            Войти
          </a>
          <a
            href="/register-plot"
            className="rounded-full border border-[#5E704F] px-6 py-3 text-center text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
          >
            Зарегистрировать участок
          </a>
        </div>

        <div className="mt-8 rounded-2xl border border-[#5E704F]/20 bg-[#5E704F]/5 px-4 py-3 text-sm text-zinc-700">
          После регистрации доступ будет ограничен до проверки правлением.
        </div>
      </div>
    </main>
  );
}
