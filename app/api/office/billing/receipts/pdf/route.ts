import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listDebts } from "@/lib/billing.store";
import { getLatestRequisites, type Requisites } from "@/lib/requisites.store";
import { generatePaymentPurpose } from "@/lib/paymentPurpose";
import { getPaymentQRContent } from "@/lib/paymentQR";

// Simple HTML-to-PDF-like response (in real app would use puppeteer or similar)
function generateReceiptHtml(
  receipt: {
    plotLabel: string;
    residentName: string;
    debt: number;
    period: string;
  },
  requisites: Requisites | null
): string {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

  // Generate payment purpose
  const purpose = requisites
    ? generatePaymentPurpose(
        { plot: receipt.plotLabel, name: receipt.residentName, period: receipt.period },
        requisites.purposeTemplate
      )
    : `Членский взнос за участок ${receipt.plotLabel}, ${receipt.period}. ${receipt.residentName}`;

  // Generate QR content (data string for bank apps)
  const qrContent = requisites
    ? getPaymentQRContent({
        requisites,
        amount: receipt.debt,
        purpose,
        payerName: receipt.residentName,
      })
    : null;

  // Build requisites section
  const requisitesHtml = requisites
    ? `
      <div style="margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px;">Реквизиты для оплаты:</h4>
        <table style="font-size: 12px; width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 3px 10px 3px 0; color: #666;">Получатель:</td><td style="padding: 3px 0;">${requisites.recipientName}</td></tr>
          <tr><td style="padding: 3px 10px 3px 0; color: #666;">ИНН:</td><td style="padding: 3px 0;">${requisites.inn}</td></tr>
          <tr><td style="padding: 3px 10px 3px 0; color: #666;">КПП:</td><td style="padding: 3px 0;">${requisites.kpp}</td></tr>
          <tr><td style="padding: 3px 10px 3px 0; color: #666;">Банк:</td><td style="padding: 3px 0;">${requisites.bankName}</td></tr>
          <tr><td style="padding: 3px 10px 3px 0; color: #666;">БИК:</td><td style="padding: 3px 0;">${requisites.bik}</td></tr>
          <tr><td style="padding: 3px 10px 3px 0; color: #666;">Р/счёт:</td><td style="padding: 3px 0; font-family: monospace;">${requisites.account}</td></tr>
          <tr><td style="padding: 3px 10px 3px 0; color: #666;">Корр. счёт:</td><td style="padding: 3px 0; font-family: monospace;">${requisites.corrAccount}</td></tr>
        </table>
      </div>
    `
    : "";

  // Build purpose section
  const purposeHtml = `
    <div style="margin-top: 15px; padding: 12px; border: 2px solid #f59e0b; border-radius: 8px; background: #fffbeb;">
      <div style="font-size: 11px; color: #92400e; font-weight: bold; margin-bottom: 5px;">НАЗНАЧЕНИЕ ПЛАТЕЖА:</div>
      <div style="font-size: 13px; color: #1f2937;">${purpose}</div>
    </div>
  `;

  // QR code placeholder (real QR generation would require a library)
  const qrHtml = qrContent
    ? `
      <div style="margin-top: 15px; text-align: center;">
        <div style="display: inline-block; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
          <div style="width: 120px; height: 120px; border: 2px dashed #d1d5db; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #9ca3af;">
            QR-код<br/>для оплаты
          </div>
          <div style="font-size: 10px; color: #6b7280; margin-top: 8px;">Сканируйте в приложении банка</div>
        </div>
      </div>
    `
    : "";

  return `
    <div style="page-break-after: always; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="text-align: center; margin-bottom: 20px;">КВИТАНЦИЯ НА ОПЛАТУ</h2>
      <p><strong>Период:</strong> ${receipt.period}</p>
      <p><strong>Участок:</strong> ${receipt.plotLabel}</p>
      <p><strong>Владелец:</strong> ${receipt.residentName}</p>
      <hr style="margin: 20px 0;" />
      <p style="font-size: 18px;"><strong>К оплате:</strong> ${formatCurrency(receipt.debt)}</p>
      ${requisitesHtml}
      ${purposeHtml}
      ${qrHtml}
      <hr style="margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">
        Оплату можно произвести переводом по указанным реквизитам, через QR-код в приложении банка или наличными в кассу.
      </p>
    </div>
  `;
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session || !isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/receipts/pdf",
      role: session?.role ?? null,
      userId: session?.id ?? null,
      status: session ? 403 : 401,
      latencyMs: Date.now() - startedAt,
      error: session ? "FORBIDDEN" : "UNAUTHORIZED",
    });
    return NextResponse.json(
      { ok: false, error: { code: session ? "forbidden" : "unauthorized", message: "Forbidden" } },
      { status: session ? 403 : 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const minDebt = Number(searchParams.get("minDebt") ?? "0");
  const period = searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
  const plotIdsParam = searchParams.get("plotIds");
  const plotIds = plotIdsParam ? plotIdsParam.split(",") : null;

  let debts = listDebts().filter((d) => d.debt >= minDebt);
  if (plotIds && plotIds.length > 0) {
    debts = debts.filter((d) => plotIds.includes(d.key));
  }

  if (debts.length === 0) {
    return NextResponse.json(
      { ok: false, error: { code: "no_data", message: "Нет данных для формирования квитанций" } },
      { status: 400 }
    );
  }

  // Get requisites for all receipts
  const requisites = getLatestRequisites();

  const receiptsHtml = debts
    .map((debt) =>
      generateReceiptHtml(
        {
          plotLabel: debt.plotId,
          residentName: debt.residentName,
          debt: debt.debt,
          period,
        },
        requisites
      )
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Квитанции на оплату - ${period}</title>
      <style>
        @media print {
          body { margin: 0; }
          div { page-break-after: always; }
          div:last-child { page-break-after: auto; }
        }
      </style>
    </head>
    <body>
      ${receiptsHtml}
    </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `inline; filename="receipts-${period}.html"`,
    },
  });
}
