import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { addTargetFund } from "@/lib/mockDb";
import { listTargetFundsWithStats } from "@/lib/targets";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ items: listTargetFundsWithStats(false) });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim();
  const description = (body.description as string | undefined)?.trim() || "";
  const targetAmount = Number(body.targetAmount);
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return NextResponse.json({ error: "invalid targetAmount" }, { status: 400 });

  const fund = addTargetFund({ title, description, targetAmount, status: "active" });
  return NextResponse.json({ fund }, { status: 201 });
}
