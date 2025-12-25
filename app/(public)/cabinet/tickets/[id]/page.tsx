import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { findTicketById, isTicketOwnedByUser } from "@/lib/ticketsDb";
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

export default async function TicketDetail({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  const ticket = findTicketById(params.id);
  if (!ticket) {
    notFound();
  }
  if (!isTicketOwnedByUser(ticket, { id: user.id, contact: user.contact })) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {formatDate(ticket.createdAt)}
            </p>
            <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
          </div>
          <span className="rounded-full bg-[#5E704F]/10 px-3 py-1 text-xs font-semibold text-[#5E704F]">
            {statusLabel[ticket.status]}
          </span>
        </div>
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm whitespace-pre-line text-zinc-800">{ticket.message}</p>
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ticket.attachments.map((att, idx) => (
                <Image
                  key={`${att.url}-${idx}`}
                  src={att.url}
                  alt={`Вложение ${idx + 1}`}
                  width={320}
                  height={200}
                  className="h-28 w-full rounded-xl border border-zinc-200 object-cover"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
