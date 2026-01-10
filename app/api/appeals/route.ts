import { NextResponse } from "next/server";
import { APPEAL_TOPICS, checkAppealRateLimit, createAppeal } from "@/lib/appeals";
import { getSessionUser } from "@/lib/session.server";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !user.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const topic = typeof body.topic === "string" ? body.topic : "Общее";
  const message = typeof body.message === "string" ? body.message : "";
  const trimmed = message.trim();
  if (!checkAppealRateLimit(user.id)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Слишком много обращений. Попробуйте позже." },
      { status: 429 },
    );
  }
  if (!trimmed || trimmed.length < 10 || trimmed.length > 4000) {
    return NextResponse.json(
      { error: "validation", message: "Сообщение должно быть от 10 до 4000 символов." },
      { status: 400 },
    );
  }
  if (!APPEAL_TOPICS.includes(topic)) {
    return NextResponse.json({ error: "validation", message: "Некорректная тема." }, { status: 400 });
  }
  const appeal = await createAppeal(user.id, trimmed, topic);
  return NextResponse.json({ ok: true, appeal });
}
