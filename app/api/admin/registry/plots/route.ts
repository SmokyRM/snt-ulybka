import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { listPlotsWithFilters } from "@/lib/mockDb";

const parseQuery = (request: Request) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "50");
  return { query, page: Number.isFinite(page) && page > 0 ? page : 1, limit: Number.isFinite(limit) && limit > 0 ? limit : 50 };
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { query, page, limit } = parseQuery(request);
  const { items, total } = listPlotsWithFilters({ query, page, pageSize: limit });
  return NextResponse.json({ plots: items, total, page, limit });
}

