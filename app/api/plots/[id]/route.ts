import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import {
  existsStreetNumber,
  findPlotById,
  updatePlot,
} from "@/lib/plotsDb";
import { validatePlotInput } from "@/lib/plotsValidators";
import { Plot } from "@/types/snt";

type ParamsPromise<T> = { params: Promise<T> };

export async function GET(
  _request: Request,
  { params }: ParamsPromise<{ id: string }>
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const plot = findPlotById(id);
  if (!plot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ plot });
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
  const street = (body.street as string | undefined)?.trim();
  const number = (body.number as string | undefined)?.trim();
  const ownerFullName = (body.ownerFullName as string | undefined)?.trim() || null;
  const phone = (body.phone as string | undefined)?.trim() || null;
  const email = (body.email as string | undefined)?.trim() || null;
  const membershipStatus = body.membershipStatus as Plot["membershipStatus"] | undefined;
  const isConfirmed =
    typeof body.isConfirmed === "boolean" ? body.isConfirmed : undefined;
  const notes = (body.notes as string | undefined)?.trim() || null;

  const errors = validatePlotInput({
    street,
    number,
    ownerFullName,
    phone,
    email,
    membershipStatus,
    notes,
  });
  if (errors.length) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }
  if (street && number && existsStreetNumber(street, number, id)) {
    return NextResponse.json({ error: "Такой участок уже существует." }, { status: 400 });
  }

  const updated = updatePlot(id, {
    street,
    number,
    ownerFullName,
    phone,
    email,
    membershipStatus,
    isConfirmed,
    notes,
  });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ plot: updated });
}

