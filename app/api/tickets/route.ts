import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import {
  createTicket,
  listTickets,
  listTicketsForAuthor,
} from "@/lib/ticketsDb";

const validate = (subject?: string, message?: string) => {
  const errors: string[] = [];
  if (!subject || subject.trim().length < 3 || subject.trim().length > 120) {
    errors.push("Тема должна быть от 3 до 120 символов.");
  }
  if (!message || message.trim().length < 10 || message.trim().length > 2000) {
    errors.push("Текст обращения должен быть от 10 до 2000 символов.");
  }
  return errors;
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "admin") {
    return NextResponse.json({ tickets: listTickets() });
  }

  const tickets = listTicketsForAuthor(user.id ?? "", user.contact);
  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const subject = (body.subject as string | undefined)?.trim();
  const message = (body.message as string | undefined)?.trim();

  const errors = validate(subject, message);
  if (errors.length) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const authorId = user.id || user.contact || "anonymous";
  const ticket = createTicket({
    authorId,
    authorContact: user.contact ?? null,
    authorName: user.fullName ?? null,
    authorPhone: user.phone ?? null,
    subject: subject as string,
    message: message as string,
  });

  return NextResponse.json({ ticket }, { status: 201 });
}

