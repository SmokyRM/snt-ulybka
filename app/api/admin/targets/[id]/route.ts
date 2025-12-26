import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { getTargetFundTimeline, getTargetFundWithStats } from "@/lib/targets";

type ParamsPromise<T> = { params: Promise<T> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: Request, { params }: ParamsPromise<{ id: string }>) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const fund = getTargetFundWithStats(id);
  if (!fund) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const timeline = getTargetFundTimeline(id);
  return NextResponse.json({ fund, timeline });
}
