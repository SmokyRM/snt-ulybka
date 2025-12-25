import LoginForm from "./LoginForm";

type SearchParams = {
  next?: string | string[];
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const rawNext = Array.isArray(searchParams?.next)
    ? searchParams?.next[0]
    : searchParams?.next;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <LoginForm nextParam={rawNext} />
      </div>
    </main>
  );
}

