const buildLabel = () => {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const ref = process.env.VERCEL_GIT_COMMIT_REF;
  const base = sha ? `Build: ${sha}` : `Build: ${new Date().toISOString()}`;
  return ref ? `${base} (${ref})` : base;
};

export default function Footer() {
  return (
    <footer className="border-t border-[#5E704F]/15 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-4 text-sm text-zinc-600 sm:flex-row sm:items-center sm:px-6">
        <div className="text-zinc-900">
          <span className="font-semibold">СНТ «Улыбка»</span>
        </div>
        <div className="flex flex-col items-start gap-1 text-xs text-zinc-600 sm:items-end">
          <span>© {new Date().getFullYear()} Официальный сайт СНТ</span>
          <span>{buildLabel()}</span>
        </div>
      </div>
    </footer>
  );
}
