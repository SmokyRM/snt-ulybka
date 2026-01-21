export default function CabinetOnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-5xl">{children}</div>
    </main>
  );
}
