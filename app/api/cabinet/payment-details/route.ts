/**
 * Cabinet Payment Details API
 * Sprint 31: Get payment details with requisites, purpose, and QR data for resident
 */
import { ok, unauthorized, forbidden, fail, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isResidentRole } from "@/lib/rbac";
import { findUserById } from "@/lib/mockDb";
import { getLatestRequisites } from "@/lib/requisites.store";
import { buildResidentBillingSummary } from "@/lib/cabinet/billing.server";
import { generatePaymentPurpose, type PaymentPurposeParams } from "@/lib/paymentPurpose";
import { getPaymentQRContent, validatePaymentQRData } from "@/lib/paymentQR";

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) {
    return unauthorized(request);
  }
  if (!isResidentRole(session.role)) {
    return forbidden(request);
  }

  try {
    const url = new URL(request.url);
    const periodParam = url.searchParams.get("period");

    // Get requisites
    const requisites = getLatestRequisites();
    if (!requisites) {
      return fail(request, "no_requisites", "Реквизиты не найдены", 404);
    }

    // Get user info
    const user = findUserById(session.id);
    const userName = user?.fullName || "Владелец";

    // Get billing summary to find plot info and debt
    const billingSummary = buildResidentBillingSummary(session.id);
    const plotLabel = billingSummary.plotLabel || "участок";

    // Determine period (default to current month)
    const period = periodParam || new Date().toISOString().slice(0, 7);

    // Find debt for the specific period or total debt
    let amount = billingSummary.totalDebt;
    const periodData = billingSummary.periods.find((p) => p.period === period);
    if (periodData) {
      amount = periodData.debt;
    }

    // Generate payment purpose
    const purposeParams: PaymentPurposeParams = {
      plot: plotLabel,
      name: userName,
      period,
    };
    const purpose = generatePaymentPurpose(purposeParams, requisites.purposeTemplate);

    // Generate QR content
    const qrData = {
      requisites,
      amount,
      purpose,
      payerName: userName,
    };
    const validation = validatePaymentQRData(qrData);
    const qrContent = validation.valid ? getPaymentQRContent(qrData) : null;

    return ok(request, {
      requisites: {
        title: requisites.title,
        recipientName: requisites.recipientName,
        inn: requisites.inn,
        kpp: requisites.kpp,
        bankName: requisites.bankName,
        bik: requisites.bik,
        account: requisites.account,
        corrAccount: requisites.corrAccount,
      },
      payment: {
        period,
        amount,
        purpose,
        plotLabel,
        userName,
      },
      qr: {
        content: qrContent,
        valid: validation.valid,
        errors: validation.errors,
      },
    });
  } catch (error) {
    return serverError(request, "Ошибка при получении реквизитов для оплаты", error);
  }
}
