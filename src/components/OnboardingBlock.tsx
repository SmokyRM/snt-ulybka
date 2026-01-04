import Link from "next/link";

type Props = {
  title?: string;
  message?: string;
  ctaLabel?: string;
};

export default function OnboardingBlock({
  title = "Регистрация не завершена",
  message = "Чтобы открыть этот раздел, завершите регистрацию.",
  ctaLabel = "Продолжить регистрацию",
}: Props) {
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
          <p className="text-sm text-zinc-700">{message}</p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex w-full items-center justify-center rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] sm:w-auto"
        >
          {ctaLabel}
        </Link>
      </div>
    </main>
  );
}
