import { getSessionUser, hasImportAccess } from "@/lib/session.server";
import { forbidden, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasImportAccess(user)) {
      return forbidden(request, "forbidden");
    }

    // v2 format template
    const headers = [
      "Улица_СНТ_номер",
      "Участок_номер",
      "ФИО",
      "Телефон",
      "Email",
      "Городской_адрес",
      "Примечание",
    ];
    const example = ["1", "12", "Иванов Иван Иванович", "+79001234567", "ivan@example.com", "г. Москва, ул. Примерная, д. 1", "Комментарий"];

    const BOM = "\uFEFF";
    const content = BOM + headers.join(";") + "\r\n" + example.join(";") + "\r\n";

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="registry_template.csv"',
      },
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
