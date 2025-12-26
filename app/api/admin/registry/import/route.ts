import { NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { listPlotsWithFilters, upsertRegistryPlot } from "@/lib/mockDb";

type IncomingRow = {
  plot_display: string;
  cadastral_number?: string | null;
  seed_owner_name?: string | null;
  seed_owner_phone?: string | null;
  note?: string | null;
};

const normalizePhone = (value: string) => value.replace(/\D+/g, "");

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ ok: false, errors: ["forbidden"] }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { rows?: IncomingRow[] } | null;
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ ok: false, errors: ["invalid_body"] }, { status: 400 });
  }
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const existing = listPlotsWithFilters({ page: 1, pageSize: 10000 }).items;

  for (const row of body.rows) {
    if (!row.plot_display) {
      skipped++;
      continue;
    }
    const display = row.plot_display.trim();
    const cadastral = row.cadastral_number?.trim() || null;
    const match = cadastral
      ? existing.find((p) => (p.cadastral || "").toLowerCase() === cadastral.toLowerCase())
      : existing.find((p) => {
          const disp = `Улица ${p.street}, участок ${p.plotNumber}`.toLowerCase();
          return disp === display.toLowerCase();
        });
    try {
      const res = upsertRegistryPlot({
        id: match?.id,
        plotDisplay: display,
        cadastral: cadastral || match?.cadastral || null,
        seedOwnerName: row.seed_owner_name?.trim() || match?.ownerFullName || null,
        seedOwnerPhone: row.seed_owner_phone ? normalizePhone(row.seed_owner_phone) : match?.phone || null,
        note: row.note?.trim() || match?.notes || null,
      });
      if (!res) {
        skipped++;
      } else if (match) {
        updated++;
      } else {
        created++;
      }
    } catch (e) {
      errors.push(`Ошибка строки ${display}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ ok: errors.length === 0, created, updated, skipped, errors });
}
