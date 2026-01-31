/**
 * Public Requisites API
 * Sprint 31: Get latest payment requisites (no auth required)
 */
import { ok, serverError } from "@/lib/api/respond";
import { getLatestRequisites } from "@/lib/requisites.store";

export async function GET(request: Request) {
  try {
    const requisites = getLatestRequisites();

    if (!requisites) {
      return ok(request, { requisites: null });
    }

    // Return only public fields (exclude internal metadata)
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
        purposeTemplate: requisites.purposeTemplate,
        version: requisites.version,
        updatedAt: requisites.updatedAt,
      },
    });
  } catch (error) {
    return serverError(request, "Ошибка при получении реквизитов", error);
  }
}
