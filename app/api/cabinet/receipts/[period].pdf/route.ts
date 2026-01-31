import { NextResponse } from "next/server";

import { badRequest, forbidden, unauthorized } from "@/lib/api/respond";
import { buildResidentBillingSummary } from "@/lib/cabinet/billing.server";
import { isResidentRole } from "@/lib/rbac";
import { getEffectiveSessionUser } from "@/lib/session.server";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

function buildReceiptHtml(params: {
  period: string;
  plotLabel: string;
  residentName: string;
  debt: number;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Квитанция ${params.period}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; }
        .title { text-align: center; margin-bottom: 20px; }
        .row { margin: 6px 0; }
        .debt { font-size: 18px; font-weight: bold; margin-top: 12px; }
      </style>
    </head>
    <body>
      <h2 class="title">КВИТАНЦИЯ НА ОПЛАТУ</h2>
      <div class="row"><strong>Период:</strong> ${params.period}</div>
      <div class="row"><strong>Участок:</strong> ${params.plotLabel}</div>
      <div class="row"><strong>Владелец:</strong> ${params.residentName}</div>
      <div class="debt">К оплате: ${formatCurrency(params.debt)}</div>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        Оплату можно произвести по реквизитам СНТ или наличными в кассу.
      </p>
    </body>
    </html>
  `;
}

export async function GET(request: Request, { params }: { params: { period: string } }) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) {
    return unauthorized(request);
  }
  if (!isResidentRole(session.role)) {
    return forbidden(request);
  }

  const period = params.period;
  if (!period) {
    return badRequest(request, "Не указан период");
  }

  const summary = buildResidentBillingSummary(session.id);
  const selected = summary.periods.find((item) => item.period === period);
  if (!selected) {
    return badRequest(request, "Квитанция за этот период недоступна");
  }

  const html = buildReceiptHtml({
    period,
    plotLabel: summary.plotLabel ?? "—",
    residentName: session.fullName ?? "Житель",
    debt: selected.debt,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `inline; filename="receipt-${period}.html"`,
    },
  });
}
