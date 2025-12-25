import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { listImportBatches } from "@/lib/mockDb";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json({ ok: true, items: listImportBatches() });
}
