import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { addExpense, listExpenses } from "@/lib/mockDb";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasFinanceAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const date = (body.date as string | undefined)?.trim();
  const amount = Number(body.amount);
  const category = body.category as
    | "roads"
    | "trash"
    | "security"
    | "lighting"
    | "electricity"
    | "other"
    | undefined;
  const description = (body.description as string | undefined)?.trim();
  const vendor = (body.vendor as string | undefined)?.trim() || null;
  const targetFundId = (body.targetFundId as string | undefined)?.trim() || null;

  if (!date || Number.isNaN(new Date(date).getTime())) {
    return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Некорректная сумма" }, { status: 400 });
  }
  if (!category) return NextResponse.json({ error: "Категория обязательна" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Описание обязательно" }, { status: 400 });

  const exp = addExpense({
    date: new Date(date).toISOString(),
    amount,
    category,
    description,
    vendor,
    targetFundId,
    createdByUserId: user.id ?? null,
  });
  return NextResponse.json({ expense: exp }, { status: 201 });
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasFinanceAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const category = url.searchParams.get("category") as
    | "roads"
    | "trash"
    | "security"
    | "lighting"
    | "electricity"
    | "other"
    | null;
  const expenses = listExpenses({ from, to, category });
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return NextResponse.json({ items: expenses, total });
}
