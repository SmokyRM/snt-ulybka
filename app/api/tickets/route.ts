import { getSessionUser } from "@/lib/session.server";
import {
  createTicket,
  listTickets,
  listTicketsForAuthor,
} from "@/lib/ticketsDb";
import { Ticket } from "@/types/snt";
import { ok, badRequest, unauthorized, methodNotAllowed, serverError } from "@/lib/api/respond";

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

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return unauthorized(request);
    }

    const tickets = user.role === "admin" ? listTickets() : listTicketsForAuthor(user.id ?? "", user.contact);
    return ok(request, { tickets });
  } catch (error) {
    return serverError(request, "Ошибка при получении обращений", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return unauthorized(request);
    }

    const body = await request.json().catch(() => ({}));
    const subject = (body.subject as string | undefined)?.trim();
    const message = (body.message as string | undefined)?.trim();
    const attachments = Array.isArray(body.attachments) ? (body.attachments as string[]) : [];

    const errors = validate(subject, message);
    if (attachments.length > 3) {
      errors.push("Можно прикрепить не более 3 изображений.");
    }
    const mappedAttachments: Ticket["attachments"] = [];
    for (const url of attachments) {
      if (typeof url !== "string") {
        errors.push("Некорректный формат вложения.");
        break;
      }
      const trimmed = url.trim();
      if (!trimmed.startsWith("data:image/")) {
        errors.push("Допустимы только изображения, загруженные через форму.");
        break;
      }
      mappedAttachments.push({ url: trimmed, type: "image" });
    }

    if (errors.length) {
      return badRequest(request, errors.join(" "));
    }

    const authorId = user.id || user.contact || "anonymous";
    const ticket = createTicket({
      authorId,
      authorContact: user.contact ?? null,
      authorName: user.fullName ?? null,
      authorPhone: user.phone ?? null,
      subject: subject as string,
      message: message as string,
      attachments: mappedAttachments,
    });

    return ok(request, { ticket }, { status: 201 });
  } catch (error) {
    return serverError(request, "Ошибка при создании обращения", error);
  }
}

// Allow-list методов
export async function PUT() {
  return methodNotAllowed(new Request("http://localhost"), ["GET", "POST"]);
}

export async function PATCH() {
  return methodNotAllowed(new Request("http://localhost"), ["GET", "POST"]);
}

export async function DELETE() {
  return methodNotAllowed(new Request("http://localhost"), ["GET", "POST"]);
}
