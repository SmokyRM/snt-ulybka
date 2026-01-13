import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";

type FeedbackBody = {
  messageId?: string;
  conversationKey?: string;
  userId?: string | null;
  role?: string | null;
  zone?: string;
  module?: string | null;
  pathname?: string | null;
  rating?: "up" | "down";
  context?: { intent?: string | null; page?: string | null; module?: string | null };
};

export async function POST(request: Request) {
  try {
    const session = await getEffectiveSessionUser();
    const body = (await request.json().catch(() => ({}))) as FeedbackBody;
    const rating = body.rating === "up" || body.rating === "down" ? body.rating : null;
    if (!rating || !body.messageId) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const payload = {
      messageId: body.messageId,
      conversationKey: body.conversationKey ?? "unknown",
      userId: session?.id ?? body.userId ?? "guest",
      role: session?.role ?? body.role ?? "guest",
      zone: body.zone ?? "unknown",
      module: body.module ?? body.context?.module ?? null,
      pathname: body.pathname ?? body.context?.page ?? null,
      rating,
      context: {
        ...body.context,
        module: body.module ?? body.context?.module ?? null,
        page: body.pathname ?? body.context?.page ?? null,
      },
      ts: new Date().toISOString(),
    };
    console.log("[assistant-feedback]", payload);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
