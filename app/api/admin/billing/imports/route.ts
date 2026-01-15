import { NextResponse } from "next/server";
import { getSessionUser, hasBillingAccess } from "@/lib/session.server";
import { listBillingImports } from "@/lib/mockDb";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasBillingAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const imports = listBillingImports();
  return NextResponse.json({ ok: true, items: imports });
}
