import { NextResponse } from "next/server";
import { listTargetFundsWithStats } from "@/lib/targets";

export async function GET() {
  const items = listTargetFundsWithStats(true);
  return NextResponse.json({ items });
}
