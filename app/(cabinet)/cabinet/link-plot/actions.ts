"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { createResidentAndRequestOwnership } from "@/lib/residentsRegistry.store";
import { normalizePlotLabel } from "@/lib/plotsMaster.store";

export type LinkPlotState = { ok: boolean; error: string | null };

export async function submitLinkPlotAction(prevState: LinkPlotState | undefined, formData: FormData): Promise<LinkPlotState> {
  const user = await getSessionUser();
  if (!user || (user.role !== "resident" && user.role !== "user" && user.role !== "admin")) {
    redirect("/login?next=/cabinet/link-plot");
  }
  const fio = (formData.get("fio")?.toString() ?? user.fullName ?? "").trim();
  const phone = (formData.get("phone")?.toString() ?? user.phone ?? "").trim();
  const address = (formData.get("address")?.toString() ?? "").trim();
  const streetNo = Number(formData.get("streetNo")?.toString() ?? "0");
  const plotLabel = normalizePlotLabel(formData.get("plotLabel")?.toString() ?? "");
  if (!fio || !streetNo || !plotLabel) return { ok: false, error: "Заполните ФИО и участок" };

  const result = createResidentAndRequestOwnership({
    residentId: user.id,
    fio,
    phone,
    address,
    streetNo,
    plotLabel,
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Не удалось создать запрос" };
  }
  redirect("/cabinet/verification");
}
