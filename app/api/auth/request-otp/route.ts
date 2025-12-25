import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth";
import { upsertUser } from "@/lib/mockDb";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const contact = (body.contact as string | undefined)?.trim();

  if (!contact) {
    return NextResponse.json({ error: "Укажите email или телефон." }, { status: 400 });
  }

  const code = requestOtp(contact);
  upsertUser({ contact });

  return NextResponse.json({
    ok: true,
    code,
    hint: "Тестовый код для DEV",
  });
}
