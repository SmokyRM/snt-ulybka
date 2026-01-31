/**
 * Cabinet Payment Confirmations API
 * Sprint 21: Resident payment confirmation submissions
 */
import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import {
  createPaymentConfirmation,
  listPaymentConfirmations,
  getPaymentConfirmationsSummary,
  type PaymentMethod,
  type PaymentConfirmationAttachment,
} from "@/lib/paymentConfirmations.store";

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);

  if (!session) {
    return unauthorized(request);
  }

  if (session.role !== "resident") {
    return forbidden(request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "submitted" | "in_review" | "approved" | "rejected" | null;

    const confirmations = listPaymentConfirmations({
      userId: session.id,
      status: status || undefined,
    });

    const summary = getPaymentConfirmationsSummary({ userId: session.id });

    return ok(request, { confirmations, summary });
  } catch (error) {
    return serverError(request, "Ошибка получения подтверждений оплаты", error);
  }
}

export async function POST(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);

  if (!session) {
    return unauthorized(request);
  }

  if (session.role !== "resident") {
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => ({}));

    const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return fail(request, "invalid_amount", "Укажите корректную сумму", 400);
    }

    const paidAt = typeof body.paidAt === "string" ? body.paidAt : null;
    if (!paidAt) {
      return fail(request, "invalid_date", "Укажите дату оплаты", 400);
    }

    const method = body.method as PaymentMethod;
    if (!["cash", "card", "bank", "other"].includes(method)) {
      return fail(request, "invalid_method", "Укажите способ оплаты", 400);
    }

    const plotId = typeof body.plotId === "string" ? body.plotId : session.plotNumber;
    if (!plotId) {
      return fail(request, "invalid_plot", "Укажите номер участка", 400);
    }

    const comment = typeof body.comment === "string" ? body.comment : null;

    let attachment: PaymentConfirmationAttachment | null = null;
    if (body.attachment && typeof body.attachment === "object") {
      attachment = {
        fileName: body.attachment.fileName || "receipt",
        filePath: body.attachment.filePath || body.attachment.url || "",
        mimeType: body.attachment.mimeType || body.attachment.mime || "image/jpeg",
        size: body.attachment.size || 0,
        uploadedAt: new Date().toISOString(),
      };
    }

    const confirmation = createPaymentConfirmation({
      userId: session.id,
      plotId,
      amount,
      paidAt,
      method,
      comment,
      attachment,
    });

    return ok(request, { confirmation });
  } catch (error) {
    return serverError(request, "Ошибка создания подтверждения оплаты", error);
  }
}
