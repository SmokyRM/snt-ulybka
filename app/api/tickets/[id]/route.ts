import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import {
  findTicketById,
  isTicketOwnedByUser,
  updateTicketStatus,
} from "@/lib/ticketsDb";
import { TicketStatus } from "@/types/snt";

const allowedStatuses: TicketStatus[] = ["NEW", "IN_PROGRESS", "DONE"];

type ParamsPromise<T> = { params: Promise<T> };

export async function GET(
  _request: Request,
  { params }: ParamsPromise<{ id: string }>
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ticket = findTicketById(id);
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (user.role !== "admin" && !isTicketOwnedByUser(ticket, { id: user.id, contact: user.contact })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ ticket });
}

export async function PATCH(
  request: Request,
  { params }: ParamsPromise<{ id: string }>
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const status = body.status as TicketStatus | undefined;
  if (!status || !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 });
  }
  const updated = updateTicketStatus(id, status);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ticket: updated });
}
