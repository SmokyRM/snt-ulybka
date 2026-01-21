import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { unauthorized, forbidden } from "@/lib/api/respond";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    return forbidden(request);
  }

  // CSV template with BOM for Excel
  const csv = "\uFEFFДата,Сумма,Назначение,ФИО,Телефон,Участок,Номер операции\n2025-01-15,5000.00,Членские взносы,Иванов Иван Иванович,+7 (999) 123-45-67,1,OP-12345\n2025-01-20,3000.00,Электроэнергия,Петров Петр Петрович,+7 (999) 234-56-78,2,OP-12346";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="payment-import-template.csv"',
    },
  });
}
