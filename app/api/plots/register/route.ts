import { NextResponse } from "next/server";
import {
  claimPlot,
  findPlotByCode,
  findPlotByNumberStreet,
  isPlotTaken,
} from "@/lib/plotsDb";
import { upsertUser } from "@/lib/mockDb";

const SESSION_COOKIE = "snt_session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const plotNumber = (body.plotNumber as string | undefined)?.trim();
  const street = (body.street as string | undefined)?.trim();
  const fullName = (body.fullName as string | undefined)?.trim();
  const phone = (body.phone as string | undefined)?.trim();
  const email = (body.email as string | undefined)?.trim();
  const plotCode = (body.plotCode as string | undefined)?.trim();
  const consentPD = Boolean(body.consentPD);
  const acceptedCharter = Boolean(body.acceptedCharter);

  if (!plotNumber || !street || !fullName || !phone || !plotCode) {
    return NextResponse.json({ error: "Заполните обязательные поля." }, { status: 400 });
  }
  if (!consentPD || !acceptedCharter) {
    return NextResponse.json({ error: "Необходимо подтвердить согласия." }, { status: 400 });
  }

  const plot = findPlotByNumberStreet(plotNumber, street);
  if (!plot) {
    return NextResponse.json(
      { error: "Участок с такими номером и улицей не найден." },
      { status: 400 }
    );
  }
  if (isPlotTaken(plot.plotId)) {
    return NextResponse.json(
      { error: "Участок уже занят другим пользователем." },
      { status: 400 }
    );
  }
  const codeMatch = findPlotByCode(plotCode);
  if (!codeMatch || codeMatch.plotId !== plot.plotId) {
    return NextResponse.json({ error: "Неверный код участка." }, { status: 400 });
  }

  const user = upsertUser({
    contact: phone || email || "",
    fullName,
    phone,
    email,
    plotNumber,
    street,
    role: "user",
    status: "pending",
  });

  const claimed = claimPlot(plot.plotId, user.id);
  if (!claimed) {
    return NextResponse.json(
      { error: "Не удалось закрепить участок. Попробуйте снова." },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    SESSION_COOKIE,
    JSON.stringify({ userId: user.id, contact: phone || email }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }
  );

  return res;
}
