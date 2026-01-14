import { NextResponse } from "next/server";
import { qaEnabled } from "@/lib/qaScenario";
import { writeQaScenarioCookie } from "@/lib/qaScenario.server";

export async function POST() {
  if (!qaEnabled()) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  await writeQaScenarioCookie(null);
  return NextResponse.json({ ok: true });
}
