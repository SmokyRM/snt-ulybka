import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sha = process.env.VERCEL_GIT_COMMIT_SHA || "local";
  const builtAt = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

  return NextResponse.json({ sha, builtAt });
}
