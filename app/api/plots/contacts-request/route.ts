import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { listPlots } from "@/lib/plotsDb";
import { Plot } from "@/types/snt";

const matchesSearch = (plot: Plot, q?: string) => {
  if (!q) return true;
  const haystack = `${plot.street} ${plot.number} ${plot.ownerFullName ?? ""}`.toLowerCase();
  return haystack.includes(q.toLowerCase());
};

const filterMissing = (plot: Plot, missing?: "all" | "phone" | "email" | "") => {
  if (missing === "all" || missing === undefined || missing === "") {
    return !plot.phone && !plot.email;
  }
  if (missing === "phone") return !plot.phone;
  if (missing === "email") return !plot.email;
  return true;
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const missingParam = url.searchParams.get("missing") as "all" | "phone" | "email" | "" | null;
  const q = url.searchParams.get("q") ?? undefined;

  const plots = listPlots();

  const counts = {
    missingContacts: plots.filter((p) => !p.phone && !p.email).length,
    missingPhone: plots.filter((p) => !p.phone).length,
    missingEmail: plots.filter((p) => !p.email).length,
  };

  const filtered = plots.filter(
    (p) => filterMissing(p, missingParam ?? undefined) && matchesSearch(p, q)
  );

  return NextResponse.json({ rows: filtered, counts });
}

