import { requirePermission } from "@/lib/permissionsGuard";
import { getPerson, updatePerson, deletePerson } from "@/lib/registry/core/persons.store";
import { listPlots, updatePlot } from "@/lib/registry/core/plots.store";
import { logAdminAction } from "@/lib/audit";
import { fail, ok, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  try {
    const guard = await requirePermission(request, "registry.merge", {
      route: "/api/admin/registry/persons/merge",
      deniedReason: "registry.merge",
    });
    if (guard instanceof Response) return guard;

    const body = (await request.json().catch(() => ({}))) as {
      primaryPersonId?: string;
      duplicatePersonIds?: string[];
    };

    const { primaryPersonId, duplicatePersonIds } = body;

    if (!primaryPersonId || !Array.isArray(duplicatePersonIds) || duplicatePersonIds.length === 0) {
      return fail(request, "validation_error", "Необходимо указать primaryPersonId и duplicatePersonIds", 400);
    }

    const primaryPerson = getPerson(primaryPersonId);
    if (!primaryPerson) {
      return fail(request, "not_found", "Основная запись не найдена", 404);
    }

    // Validate all duplicate persons exist
    const duplicatePersons = duplicatePersonIds
      .map((id) => {
        const person = getPerson(id);
        if (!person) {
          return null;
        }
        return { id, person };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (duplicatePersons.length !== duplicatePersonIds.length) {
      return fail(request, "not_found", "Некоторые дубликаты не найдены", 404);
    }

    // Merge data: take best values from duplicates
    let mergedFullName = primaryPerson.fullName;
    let mergedPhone = primaryPerson.phone;
    let mergedEmail = primaryPerson.email;
    const mergedPlots = new Set(primaryPerson.plots);

    duplicatePersons.forEach(({ person }) => {
      // Use fullName from duplicate if primary is empty
      if (!mergedFullName && person.fullName) {
        mergedFullName = person.fullName;
      }
      // Use phone from duplicate if primary is empty
      if (!mergedPhone && person.phone) {
        mergedPhone = person.phone;
      }
      // Use email from duplicate if primary is empty
      if (!mergedEmail && person.email) {
        mergedEmail = person.email;
      }
      // Merge plots
      person.plots.forEach((plotId) => mergedPlots.add(plotId));
    });

    // Update primary person with merged data
    const before = { ...primaryPerson };
    const updated = updatePerson(primaryPersonId, {
      fullName: mergedFullName,
      phone: mergedPhone,
      email: mergedEmail,
      plots: Array.from(mergedPlots),
    });

    if (!updated) {
      return serverError(request, "Не удалось обновить основную запись");
    }

    // Move all plots from duplicates to primary person
    let movedPlots = 0;
    duplicatePersons.forEach(({ person }) => {
      person.plots.forEach((plotId) => {
        const plot = listPlots().find((p) => p.id === plotId);
        if (plot && plot.personId !== primaryPersonId) {
          updatePlot(plotId, { personId: primaryPersonId });
          movedPlots++;
        }
      });
    });

    // Delete duplicate persons
    const deletedIds: string[] = [];
    duplicatePersons.forEach(({ id }) => {
      if (deletePerson(id)) {
        deletedIds.push(id);
      }
    });

    const diff = {
      fullName: { from: before.fullName, to: updated.fullName },
      phone: { from: before.phone ?? null, to: updated.phone ?? null },
      email: { from: before.email ?? null, to: updated.email ?? null },
      plots: { from: before.plots, to: updated.plots },
      deletedIds,
      movedPlots,
    };

    await logAdminAction({
      action: "merge_persons",
      entity: "person",
      entityId: primaryPersonId,
      before: {
        primary: before,
        duplicates: duplicatePersons.map(({ person }) => person),
      },
      after: updated,
      meta: {
        deletedIds,
        movedPlots,
        diff,
      },
      headers: request.headers,
    });

    return ok(request, {
      primaryPerson: updated,
      deletedIds,
      movedPlots,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
