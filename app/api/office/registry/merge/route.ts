import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { logAdminAction } from "@/lib/audit";
import { getPerson, updatePerson, listPlots, updatePlot } from "@/lib/registry/core";
import { listInviteCodes } from "@/lib/registry/core";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "registry.merge", {
    route: "/api/office/registry/merge",
    deniedReason: "registry.merge",
  });
  if (guard instanceof Response) return guard;
  const { session, requestId } = guard;
  if (!session) return fail(request, "unauthorized", "Unauthorized", 401);

  try {
    const body = await request.json().catch(() => ({}));
    const primaryId = typeof body.primaryId === "string" ? body.primaryId : "";
    const secondaryIds: string[] = Array.isArray(body.secondaryIds)
      ? body.secondaryIds.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const values = typeof body.values === "object" && body.values !== null ? body.values : {};

    if (!primaryId || secondaryIds.length === 0) {
      return fail(request, "validation_error", "Необходимо указать primaryId и secondaryIds", 400);
    }

    const primaryPerson = getPerson(primaryId);
    if (!primaryPerson) {
      return fail(request, "not_found", "Основная запись не найдена", 404);
    }

    const secondaryPersons = secondaryIds
      .map((id) => getPerson(id))
      .filter((person): person is NonNullable<typeof person> => person !== null);

    if (secondaryPersons.length !== secondaryIds.length) {
      return fail(request, "not_found", "Одна или несколько дубликатных записей не найдены", 404);
    }

    const mergedPlots = new Set(primaryPerson.plots);
    secondaryPersons.forEach((person) => {
      person.plots.forEach((plotId) => mergedPlots.add(plotId));
    });

    const mergedFullName =
      typeof values.fullName === "string" && values.fullName.trim() ? values.fullName.trim() : primaryPerson.fullName;
    const mergedPhone =
      typeof values.phone === "string" && values.phone.trim() ? values.phone.trim() : primaryPerson.phone;
    const mergedEmail =
      typeof values.email === "string" && values.email.trim()
        ? values.email.trim().toLowerCase()
        : primaryPerson.email;

    const beforeSnapshot = {
      primary: primaryPerson,
      secondary: secondaryPersons,
    };

    // Move plots to primary
    secondaryPersons.forEach((person) => {
      const plots = listPlots({ personId: person.id });
      plots.forEach((plot) => {
        updatePlot(plot.id, { personId: primaryId });
        mergedPlots.add(plot.id);
      });
      updatePerson(person.id, {
        status: "merged",
        mergedIntoId: primaryId,
        plots: [],
      });
    });

    updatePerson(primaryId, {
      fullName: mergedFullName,
      phone: mergedPhone ?? null,
      email: mergedEmail ?? null,
      plots: Array.from(mergedPlots),
    });

    // Move invite codes to primary
    secondaryPersons.forEach((person) => {
      const codes = listInviteCodes({ personId: person.id });
      codes.forEach((code) => {
        code.personId = primaryId;
      });
    });

    const diff = {
      fullName: { from: primaryPerson.fullName, to: mergedFullName },
      phone: { from: primaryPerson.phone ?? null, to: mergedPhone ?? null },
      email: { from: primaryPerson.email ?? null, to: mergedEmail ?? null },
      plots: { from: primaryPerson.plots, to: Array.from(mergedPlots) },
      mergedIds: secondaryPersons.map((p) => p.id),
    };

    await logAdminAction({
      action: "registry.merge",
      entity: "registry_person",
      entityId: primaryId,
      before: beforeSnapshot,
      after: {
        primaryId,
        mergedIds: secondaryPersons.map((p) => p.id),
        values: { fullName: mergedFullName, phone: mergedPhone, email: mergedEmail },
      },
      meta: { requestId, diff },
      route: "/api/office/registry/merge",
      success: true,
      headers: request.headers,
    });

    return ok(request, {
      primaryId,
      mergedIds: secondaryPersons.map((p) => p.id),
    });
  } catch (error) {
    return serverError(request, "Ошибка объединения", error);
  }
}
