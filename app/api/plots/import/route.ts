import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { addPlot, findPlotByNumberStreet, updatePlot } from "@/lib/plotsDb";
import { validatePlotInput } from "@/lib/plotsValidators";
import { Plot } from "@/types/snt";
import { logAdminAction } from "@/lib/audit";

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
  const mode = body.mode === "upsert" ? "upsert" : "skip";

  if (!rows.length) {
    return NextResponse.json({ error: "Нет данных для импорта" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { rowIndex: number; message: string }[] = [];

  rows.forEach((row, index) => {
    const street = row.street?.trim();
    const number = row.number?.trim();
    const ownerFullName = row.ownerFullName?.trim() || null;
    const phone = row.phone?.trim() || null;
    const email = row.email?.trim() || null;
    const membershipRaw = (row.membershipStatus ?? "UNKNOWN").toString().trim().toUpperCase();
    const membershipStatus: Plot["membershipStatus"] =
      membershipRaw === "MEMBER" || membershipRaw === "NON_MEMBER" ? membershipRaw : "UNKNOWN";
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
      errors.push({ rowIndex: index + 1, message: rowErrors.join(" ") });
      skipped += 1;
      return;
    }
    if (!street || !number) {
      errors.push({ rowIndex: index + 1, message: "Отсутствуют улица или номер" });
      skipped += 1;
      return;
    }

    const existing = findPlotByNumberStreet(number, street);
    if (existing) {
      if (mode === "upsert") {
        const updatedPlot = updatePlot(existing.id, {
          street: street || undefined,
          number: number || undefined,
          ownerFullName: ownerFullName || undefined,
          phone: phone || undefined,
          email: email || undefined,
          membershipStatus: membershipStatus || undefined,
          isConfirmed,
          notes: notes || undefined,
        });
        if (updatedPlot) {
          updated += 1;
          return;
        }
      }
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

  await logAdminAction({
    action: "import_plots",
    entity: "plot",
    after: { created, updated, skipped, errors },
    headers: request.headers,
  });

  return NextResponse.json({ created, updated, skipped, errors });
}
