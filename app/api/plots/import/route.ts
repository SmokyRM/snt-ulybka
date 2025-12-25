import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import {
  addPlot,
  existsStreetNumber,
  findPlotByNumberStreet,
  updatePlot,
} from "@/lib/plotsDb";
import { validatePlotInput } from "@/lib/plotsValidators";
import { Plot } from "@/types/snt";

type ImportRow = {
  street?: string;
  number?: string;
  ownerFullName?: string | null;
  phone?: string | null;
  email?: string | null;
  membershipStatus?: Plot["membershipStatus"];
  isConfirmed?: boolean;
  notes?: string | null;
};

const normalizeBool = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  }
  return false;
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? (body.rows as ImportRow[]) : [];
  const mode = body.mode === "update" ? "update" : "skip";

  if (!rows.length) {
    return NextResponse.json({ error: "Нет данных для импорта" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const street = row.street?.trim();
    const number = row.number?.trim();
    const ownerFullName = row.ownerFullName?.trim() || null;
    const phone = row.phone?.trim() || null;
    const email = row.email?.trim() || null;
    const membershipStatus =
      row.membershipStatus === "MEMBER" || row.membershipStatus === "NON_MEMBER"
        ? row.membershipStatus
        : "UNKNOWN";
    const isConfirmed = normalizeBool(row.isConfirmed);
    const notes = row.notes?.trim() || null;

    const rowErrors = validatePlotInput({
      street,
      number,
      ownerFullName,
      phone,
      email,
      membershipStatus,
      notes,
    });
    if (rowErrors.length) {
      errors.push(`Строка ${index + 1}: ${rowErrors.join(" ")}`);
      skipped += 1;
      return;
    }
    if (!street || !number) {
      errors.push(`Строка ${index + 1}: отсутствуют улица или номер`);
      skipped += 1;
      return;
    }

    const existing = findPlotByNumberStreet(number, street);
    if (existing) {
      if (mode === "update") {
        const updatedPlot = updatePlot(existing.id, {
          street,
          number,
          ownerFullName,
          phone,
          email,
          membershipStatus,
          isConfirmed,
          notes,
        });
        if (updatedPlot) {
          updated += 1;
          return;
        }
      }
      skipped += 1;
      return;
    }

    if (existsStreetNumber(street, number)) {
      skipped += 1;
      return;
    }

    addPlot({
      street,
      number,
      ownerFullName,
      phone,
      email,
      membershipStatus,
      isConfirmed,
      notes,
    });
    created += 1;
  });

  return NextResponse.json({ created, updated, skipped, errors });
}

