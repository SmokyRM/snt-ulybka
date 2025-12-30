import { NextResponse } from "next/server";
import { getSessionUser, hasImportAccess } from "@/lib/session.server";
import { listImportBatches } from "@/lib/mockDb";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasImportAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json({ ok: true, items: listImportBatches() });
}
