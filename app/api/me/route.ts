import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id ?? null,
      role: user.role,
      contact: user.contact ?? null,
    },
  });
}

