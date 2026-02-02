export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sql } from "@/db/client";

export async function GET() {
  try {
    await sql`SELECT 1 as ok`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
