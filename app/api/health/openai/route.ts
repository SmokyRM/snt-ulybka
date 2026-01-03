import { NextResponse } from "next/server";
import { hasOpenAIKey } from "@/lib/openai.server";

export async function GET() {
  return NextResponse.json({ hasKey: hasOpenAIKey() });
}
