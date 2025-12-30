import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getUsersByStatus } from "@/lib/mockDb";

export async function GET() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const users = getUsersByStatus("pending");
  return NextResponse.json({ users });
}
