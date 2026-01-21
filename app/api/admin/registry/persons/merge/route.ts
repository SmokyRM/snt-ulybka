import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { getPerson, updatePerson, deletePerson } from "@/lib/registry/core/persons.store";
import { listPlots, updatePlot } from "@/lib/registry/core/plots.store";
import { logAdminAction } from "@/lib/audit";
import { fail, forbidden, ok, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const role = user?.role;
    if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
      return forbidden(request, "Недостаточно прав");
    }

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
