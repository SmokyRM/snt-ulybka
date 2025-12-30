import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { getAccrualDebtors } from "../utils";
import { createSimplePdf } from "@/lib/simplePdf";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasFinanceAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const type = (url.searchParams.get("type") as "membership" | "electricity" | null) ?? "membership";
  const period = url.searchParams.get("period");

  const { items, periodLabel, error } = getAccrualDebtors(type, period);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const totalDebt = items.reduce((sum, i) => sum + i.debt, 0);

  const today = new Date().toLocaleDateString("ru-RU");
  const pages = items.map((item) => {
    const lines = [
      'СНТ "Улыбка" — уведомление',
      type === "membership" ? "Тип: членские взносы" : "Тип: электроэнергия",
      `Период: ${periodLabel}`,
      `Участок: ${item.street}, ${item.number}`,
      `ФИО: ${item.ownerName}`,
      `Начислено: ${item.amountAccrued.toFixed(2)} ₽`,
      `Оплачено: ${item.amountPaid.toFixed(2)} ₽`,
      `Долг: ${item.debt.toFixed(2)} ₽`,
      `Статус уведомления: ${item.notificationStatus ?? "new"}`,
      "",
      item.text,
      "",
      `Дата формирования: ${today}`,
      "Подпись: ____________________",
    ];
    return lines;
  });

  const pdfBuffer = createSimplePdf(pages.length ? pages : [["СНТ \"Улыбка\"", "Нет должников за период"]]);
  const filename = `debt_notifications_${type}_${periodLabel || "period"}.pdf`;

  await logAdminAction({
    action: "export_debtors_pdf",
    entity: "debt_notifications",
    after: { type, period: periodLabel, count: items.length, totalDebt },
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
