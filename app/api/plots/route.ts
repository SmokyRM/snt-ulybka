import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { addPlot, existsStreetNumber, listPlots } from "@/lib/plotsDb";
import { validatePlotInput } from "@/lib/plotsValidators";
import { Plot } from "@/types/snt";

const parseFilters = (request: Request) => {
  const url = new URL(request.url);
  const params = url.searchParams;
  const confirmed = params.get("confirmed");
  const membership = params.get("membership");
  const missingContacts = params.get("missingContacts");
  const q = params.get("q") ?? undefined;
  return {
    confirmed: confirmed === null ? undefined : confirmed === "1",
    membership:
      membership === "UNKNOWN" || membership === "MEMBER" || membership === "NON_MEMBER"
        ? (membership as Plot["membershipStatus"])
        : undefined,
    missingContacts: missingContacts === "1",
    q,
  };
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const filters = parseFilters(request);
  const plots = listPlots(filters);
  return NextResponse.json({ plots });
}

export async function POST(request: Request) {
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
  const isConfirmed = Boolean(body.isConfirmed);
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
  if (!street || !number) {
    return NextResponse.json({ error: "Укажите улицу и номер участка." }, { status: 400 });
  }
  if (existsStreetNumber(street, number)) {
    return NextResponse.json({ error: "Такой участок уже существует." }, { status: 400 });
  }

  const plot = addPlot({
    street,
    number,
    ownerFullName,
    phone,
    email,
    membershipStatus,
    isConfirmed,
    notes,
  });
  return NextResponse.json({ plot }, { status: 201 });
}

