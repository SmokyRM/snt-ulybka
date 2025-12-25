import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { addElectricityTariff, listElectricityTariffs } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ tariffs: listElectricityTariffs() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const price = Number(body.pricePerKwh);
  const validFrom = (body.validFrom as string | undefined)?.trim();
  if (!Number.isFinite(price) || price <= 0 || !validFrom || Number.isNaN(new Date(validFrom).getTime())) {
    return NextResponse.json({ error: "Некорректные данные тарифа" }, { status: 400 });
  }

  const tariff = addElectricityTariff({ pricePerKwh: price, validFrom: new Date(validFrom).toISOString() });
  await logAdminAction({
    action: "set_electricity_tariff",
    entity: "electricity_tariff",
    entityId: tariff.id,
    after: tariff,
  });
  return NextResponse.json({ tariff }, { status: 201 });
}
