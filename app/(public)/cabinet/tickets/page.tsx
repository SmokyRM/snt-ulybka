import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { listTicketsForAuthor } from "@/lib/ticketsDb";
import { Ticket } from "@/types/snt";

const statusLabel: Record<Ticket["status"], string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  DONE: "Решено",
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default async function CabinetTicketsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  const tickets = listTicketsForAuthor(user.id ?? "", user.contact);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Мои обращения</h1>
            <p className="text-sm text-zinc-600">
              Здесь отображаются отправленные обращения в правление.
            </p>
          </div>
          <Link
            href="/cabinet/tickets/new"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            Создать обращение
          </Link>
        </div>

        {tickets.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-700">У вас пока нет обращений.</p>
            <Link
              href="/cabinet/tickets/new"
              className="mt-3 inline-flex rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
            >
              Отправить первое обращение
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/cabinet/tickets/${ticket.id}`}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-[#5E704F]/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    {formatDate(ticket.createdAt)}
                  </div>
                  <span className="rounded-full bg-[#5E704F]/10 px-3 py-1 text-xs font-semibold text-[#5E704F]">
                    {statusLabel[ticket.status]}
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                  {ticket.subject}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-700">{ticket.message}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

