import { randomUUID } from "crypto";
import { Ticket, TicketStatus } from "@/types/snt";

type TicketInput = {
  authorId: string;
  authorContact?: string | null;
  authorName?: string | null;
  authorPhone?: string | null;
  subject: string;
  message: string;
};

interface TicketDb {
  tickets: Ticket[];
}

const getDb = (): TicketDb => {
  const g = globalThis as typeof globalThis & { __SNT_TICKETS__?: TicketDb };
  if (!g.__SNT_TICKETS__) {
    g.__SNT_TICKETS__ = { tickets: [] };
  }
  return g.__SNT_TICKETS__;
};

const createId = () =>
  `tkt-${typeof randomUUID === "function" ? randomUUID() : Math.random().toString(16).slice(2)}`;

const nowIso = () => new Date().toISOString();

export const createTicket = (input: TicketInput): Ticket => {
  const ticket: Ticket = {
    id: createId(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    authorId: input.authorId,
    authorContact: input.authorContact ?? null,
    authorName: input.authorName ?? null,
    authorPhone: input.authorPhone ?? null,
    subject: input.subject,
    message: input.message,
    status: "NEW",
    attachments: [],
  };
  const db = getDb();
  db.tickets.unshift(ticket);
  return ticket;
};

export const listTickets = (status?: TicketStatus) => {
  const db = getDb();
  return status ? db.tickets.filter((t) => t.status === status) : [...db.tickets];
};

export const listTicketsForAuthor = (authorId: string, authorContact?: string | null) => {
  const db = getDb();
  return db.tickets.filter(
    (t) => t.authorId === authorId || (authorContact && t.authorContact === authorContact)
  );
};

export const findTicketById = (id: string) => {
  const db = getDb();
  return db.tickets.find((t) => t.id === id);
};

export const updateTicketStatus = (id: string, status: TicketStatus) => {
  const db = getDb();
  db.tickets = db.tickets.map((t) =>
    t.id === id ? { ...t, status, updatedAt: nowIso() } : t
  );
  return db.tickets.find((t) => t.id === id);
};

export const isTicketOwnedByUser = (
  ticket: Ticket,
  user: { id?: string; contact?: string | null }
) => {
  if (!ticket) return false;
  if (user.id && ticket.authorId === user.id) return true;
  if (user.contact && ticket.authorContact && ticket.authorContact === user.contact) return true;
  return false;
};
