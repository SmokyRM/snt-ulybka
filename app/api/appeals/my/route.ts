import { NextResponse } from "next/server";
import { getUserAppeals } from "@/lib/appeals";
import { getSessionUser } from "@/lib/session.server";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const appeals = await getUserAppeals(user.id);
  const unreadCount = appeals.filter((a) => a.unreadByUser).length;
  return NextResponse.json({ ok: true, appeals, unreadCount });
}
