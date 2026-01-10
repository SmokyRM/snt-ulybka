import { NextResponse } from "next/server";
import { markAppealRead } from "@/lib/appeals";
import { getSessionUser } from "@/lib/session.server";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user || !user.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const updated = await markAppealRead(params.id, user.id);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
