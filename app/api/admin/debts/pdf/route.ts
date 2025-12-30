import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { logAdminAction } from "@/lib/audit";
import { getDebtsData, DebtTypeFilter } from "@/lib/debts";
import { createSimplePdf } from "@/lib/simplePdf";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasFinanceAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const period = url.searchParams.get("period");
  const type = (url.searchParams.get("type") as DebtTypeFilter | null) ?? "all";
  const minDebt = url.searchParams.get("minDebt");
  const q = url.searchParams.get("q");
  const onlyUnnotified = url.searchParams.get("onlyUnnotified") === "1";

  const { items, error } = getDebtsData({
    period,
    type,
    minDebt: minDebt ? Number(minDebt) : null,
    q,
    onlyUnnotified,
  });
  if (error) return NextResponse.json({ error }, { status: 400 });

  const today = new Date().toLocaleDateString("ru-RU");
  const pages = items.map((i) => [
    'СНТ "Улыбка" — уведомление о долге',
    `Период: ${period}`,
    `Участок: ${i.street}, ${i.number}`,
    `ФИО: ${i.ownerName}`,
    `Долг: ${i.debtTotal.toFixed(2)} ₽ (членские: ${i.debtMembership.toFixed(2)}, целевые: ${i.debtTarget.toFixed(
      2
    )}, электро: ${i.debtElectricity.toFixed(2)})`,
    `Статус уведомления: ${i.notificationStatus}`,
    `Дата формирования: ${today}`,
    "Подпись: ____________________",
  ]);

  const pdfBuffer = createSimplePdf(pages.length ? pages : [["СНТ \"Улыбка\"", "Нет долгов по фильтру"]]);
  const filename = `debts_${type}_${period ?? "period"}.pdf`;

  await logAdminAction({
    action: "export_debts_pdf",
    entity: "debts",
    after: { type, period, count: items.length },
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
