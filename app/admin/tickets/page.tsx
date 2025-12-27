import Link from "next/link";
import { redirect } from "next/navigation";
import TicketStatusActions from "./TicketStatusActions";
import { getSessionUser } from "@/lib/session.server";
import { listTickets } from "@/lib/ticketsDb";
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

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    redirect("/login?next=/admin");
  }

  const filterStatus = searchParams?.status;
  const allTickets = listTickets(
    filterStatus === "NEW" || filterStatus === "IN_PROGRESS" || filterStatus === "DONE"
      ? (filterStatus as Ticket["status"])
      : undefined
  );

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Обращения жителей</h1>
            <p className="text-sm text-zinc-600">Все тикеты, отправленные из кабинета.</p>
          </div>
          <form className="flex items-center gap-2">
            <label className="text-sm text-zinc-700">Статус:</label>
            <select
              name="status"
              defaultValue={filterStatus ?? ""}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              onChange={(e) => {
                const value = e.target.value;
                const params = new URLSearchParams();
                if (value) params.set("status", value);
                window.location.href = params.toString() ? `/admin/tickets?${params}` : "/admin/tickets";
              }}
            >
              <option value="">Все</option>
              <option value="NEW">Новый</option>
              <option value="IN_PROGRESS">В работе</option>
              <option value="DONE">Решено</option>
            </select>
          </form>
        </div>

        {allTickets.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-700">Нет обращений.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="grid grid-cols-12 gap-3 border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              <div className="col-span-2">Дата</div>
              <div className="col-span-3">Автор</div>
              <div className="col-span-4">Тема</div>
              <div className="col-span-2">Статус</div>
              <div className="col-span-1 text-right">Действие</div>
            </div>
            <div className="divide-y divide-zinc-100">
              {allTickets.map((ticket) => (
                <div key={ticket.id} className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm">
                  <div className="col-span-2 text-zinc-700">{formatDate(ticket.createdAt)}</div>
                  <div className="col-span-3">
                    <div className="font-semibold text-zinc-900">
                      {ticket.authorName || ticket.authorContact || "Неизвестно"}
                    </div>
                    {ticket.authorPhone && (
                      <div className="text-xs text-zinc-600">{ticket.authorPhone}</div>
                    )}
                  </div>
                  <div className="col-span-4">
                    <Link
                      href={`/admin/tickets/${ticket.id}`}
                      className="font-semibold text-[#2F3827] hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                    <p className="text-xs text-zinc-600 line-clamp-2">{ticket.message}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="rounded-full bg-[#5E704F]/10 px-3 py-1 text-xs font-semibold text-[#5E704F]">
                      {statusLabel[ticket.status]}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <TicketStatusActions ticketId={ticket.id} current={ticket.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

