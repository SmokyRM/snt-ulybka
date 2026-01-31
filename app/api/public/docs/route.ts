import { ok, serverError } from "@/lib/api/respond";
import { listPublicOfficeDocuments } from "@/lib/office/documentsRegistry.store";

export async function GET(request: Request) {
  try {
    const items = listPublicOfficeDocuments();
    return ok(request, { items });
  } catch (error) {
    return serverError(request, "Ошибка загрузки документов", error);
  }
}
