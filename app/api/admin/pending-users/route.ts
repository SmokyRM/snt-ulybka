import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { getUsersByStatus } from "@/lib/mockDb";

export async function GET() {
  const user = getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "board")) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const users = getUsersByStatus("pending");
  return NextResponse.json({ users });
}
