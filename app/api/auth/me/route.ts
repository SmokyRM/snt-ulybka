import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";

export async function GET() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Нет сессии" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
