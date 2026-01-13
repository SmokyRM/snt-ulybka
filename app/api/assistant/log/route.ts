import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";

type LogBody = {
  type?: string;
  trigger?: string;
  zone?: string;
  module?: string;
  pathname?: string;
  role?: string | null;
  userId?: string | null;
};

export async function POST(request: Request) {
  try {
    const session = await getEffectiveSessionUser();
    const body = (await request.json().catch(() => ({}))) as LogBody;
    const payload = {
      type: body.type ?? "assistant_log",
      trigger: body.trigger ?? null,
      zone: body.zone ?? "unknown",
      module: body.module ?? null,
      pathname: body.pathname ?? null,
      role: session?.role ?? body.role ?? "guest",
      userId: session?.id ?? body.userId ?? "guest",
      ts: new Date().toISOString(),
    };
    if (process.env.NODE_ENV !== "production") {
      console.log("[assistant-log]", payload);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
