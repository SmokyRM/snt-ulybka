import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import { getSession } from "@/lib/registry/core/importSession.store";
import { createPerson, listPersons, updatePerson } from "@/lib/registry/core/persons.store";
import { createPlot, listPlots, updatePlot } from "@/lib/registry/core/plots.store";
import { createInviteCode } from "@/lib/registry/core/inviteCodes.store";
import { logAdminAction } from "@/lib/audit";
import { fail, forbidden, ok, unauthorized, serverError } from "@/lib/api/respond";

// Normalize phone (same logic as in csvParser)
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let normalized = phone.replace(/[рдРД]\./g, "").trim();
  normalized = normalized.replace(/\D/g, "");
  if (normalized.length === 0) return null;
  if (normalized.startsWith("8") && normalized.length === 11) {
    normalized = "+7" + normalized.slice(1);
  } else if (!normalized.startsWith("+") && normalized.length === 10) {
    normalized = "+7" + normalized;
  } else if (!normalized.startsWith("+") && normalized.length === 11) {
    normalized = "+" + normalized;
  }
  return normalized;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request, "Unauthorized");
  }

  const role = user.role;
  if (!isAdminRole(role) && !isOfficeRole(role)) {
    return forbidden(request, "Forbidden");
  }

  try {
    const body = (await request.json()) as {
      sessionId?: string;
      allowPartial?: boolean; // Allow import even if errors exist
      fileName?: string;
      // Legacy support: persons array (backward compatibility)
      persons?: Array<{
        key: string;
        fullName: string;
        phone?: string | null;
        email?: string | null;
        plots: Array<{
          plotNumber: string;
          sntStreetNumber: string;
          cityAddress?: string | null;
        }>;
      }>;
    };

    const { sessionId, allowPartial = false, fileName } = body;

    // Get data from session or legacy persons array
    let rowsToProcess: Array<{
      fullName: string;
      phone?: string | null;
      email?: string | null;
      sntStreetNumber: string;
      plotNumber: string;
      cityAddress?: string | null;
      note?: string | null;
    }> = [];

    if (sessionId) {
      const session = getSession(sessionId);
      if (!session) {
        return fail(request, "not_found", "Сессия импорта не найдена или истекла", 404);
      }

      // Check if there are errors and allowPartial is false
      if (!allowPartial && session.summary.errorRows > 0) {
        return fail(
          request,
          "validation_error",
          `Нельзя применить импорт с ошибками. Ошибок: ${session.summary.errorRows}. Используйте allowPartial=true для частичного импорта.`,
          400
        );
      }

      // Convert session rows to processing format (only valid rows if !allowPartial)
      rowsToProcess = session.rows
        .filter((r) => allowPartial || r.errors.length === 0)
        .map((r) => ({
          fullName: r.fullName!,
          phone: r.phone,
          email: r.email,
          sntStreetNumber: r.sntStreetNumber!,
          plotNumber: r.plotNumber!,
          cityAddress: r.cityAddress,
          note: r.note,
        }));
    } else if (body.persons && Array.isArray(body.persons)) {
      // Legacy mode: convert persons array to rows
      for (const person of body.persons) {
        for (const plot of person.plots) {
          rowsToProcess.push({
            fullName: person.fullName,
            phone: person.phone,
            email: person.email,
            sntStreetNumber: plot.sntStreetNumber,
            plotNumber: plot.plotNumber,
            cityAddress: plot.cityAddress,
            note: null,
          });
        }
      }
    } else {
      return fail(request, "validation_error", "Некорректные данные: требуется sessionId или persons", 400);
    }

    const createdPersons: string[] = [];
    const updatedPersons: string[] = [];
    const createdPlots: string[] = [];
    const updatedPlots: string[] = [];
    const skipped: string[] = [];
    const createdInviteCodes: string[] = [];
    const errors: Array<{ rowIndex?: number; message: string }> = [];

    // Load all existing plots and persons for efficient lookup
    const allPlots = listPlots();
    const allPersons = listPersons();

    // Process each row with merge logic (идемпотентный)
    for (const row of rowsToProcess) {
      try {
        const normalizedPhone = normalizePhone(row.phone);

        // Match person: по телефону (если есть), иначе по (ФИО + Городской_адрес) если есть, иначе создается новый
        let matchedPerson = null;

        if (normalizedPhone) {
          // Match by phone (exact match)
          matchedPerson = allPersons.find((p) => p.phone === normalizedPhone);
        }

        if (!matchedPerson && row.cityAddress) {
          // Match by fullName + cityAddress (if both available)
          matchedPerson = allPersons.find(
            (p) =>
              p.fullName.toLowerCase().trim() === row.fullName.toLowerCase().trim() &&
              p.plots.some((plotId) => {
                const plot = allPlots.find((pl) => pl.id === plotId);
                return plot?.cityAddress?.toLowerCase().trim() === row.cityAddress?.toLowerCase().trim();
              })
          );
        }

        // Create or update person
        let personId: string;
        const wasCreated = !matchedPerson;

        if (matchedPerson) {
          personId = matchedPerson.id;
          // Update person fields (merge: update if new data provided)
          updatePerson(personId, {
            fullName: row.fullName.trim(),
            phone: normalizedPhone || matchedPerson.phone,
            email: row.email?.trim() || matchedPerson.email || null,
            plots: matchedPerson.plots, // Will update plots array after processing plot
          });
          if (!updatedPersons.includes(personId)) {
            updatedPersons.push(personId);
          }
        } else {
          // Create new person
          const person = createPerson({
            fullName: row.fullName.trim(),
            phone: normalizedPhone,
            email: row.email?.trim() || null,
            plots: [],
          });
          personId = person.id;
          createdPersons.push(personId);
          allPersons.push(person); // Add to cache for subsequent lookups
        }

        // Process plot: участок уникален по (sntStreetNumber, plotNumber)
        const existingPlot = allPlots.find(
          (p) => p.sntStreetNumber === row.sntStreetNumber && p.plotNumber === row.plotNumber
        );

        if (existingPlot) {
          // Update existing plot (merge: update cityAddress and personId if changed)
          const wasUpdated = updatePlot(existingPlot.id, {
            cityAddress: row.cityAddress || existingPlot.cityAddress || null,
            personId, // Update owner link (обновление привязки участок->владелец)
          });

          if (wasUpdated && !updatedPlots.includes(existingPlot.id)) {
            updatedPlots.push(existingPlot.id);
          }

          // Update person's plots array if not already included
          const person = allPersons.find((p) => p.id === personId);
          if (person && !person.plots.includes(existingPlot.id)) {
            updatePerson(personId, {
              plots: [...person.plots, existingPlot.id],
            });
            // Update cache
            const personIdx = allPersons.findIndex((p) => p.id === personId);
            if (personIdx >= 0) {
              allPersons[personIdx] = { ...allPersons[personIdx], plots: [...allPersons[personIdx].plots, existingPlot.id] };
            }
          }
        } else {
          // Create new plot
          const plot = createPlot({
            plotNumber: row.plotNumber,
            sntStreetNumber: row.sntStreetNumber,
            cityAddress: row.cityAddress || null,
            personId,
          });
          createdPlots.push(plot.id);
          allPlots.push(plot); // Add to cache

          // Update person's plots array
          const person = allPersons.find((p) => p.id === personId);
          if (person) {
            updatePerson(personId, {
              plots: [...person.plots, plot.id],
            });
            // Update cache
            const personIdx = allPersons.findIndex((p) => p.id === personId);
            if (personIdx >= 0) {
              allPersons[personIdx] = { ...allPersons[personIdx], plots: [...allPersons[personIdx].plots, plot.id] };
            }
          }
        }

        // Generate invite code for person (if doesn't exist and was just created)
        if (wasCreated) {
          try {
            const { code } = createInviteCode(personId);
            createdInviteCodes.push(code);
          } catch (inviteError) {
            // Ignore invite code errors (code might already exist)
          }
        }
      } catch (rowError) {
        errors.push({
          rowIndex: (row as { rowIndex?: number }).rowIndex,
          message: rowError instanceof Error ? rowError.message : "Неизвестная ошибка",
        });
      }
    }

    // Log action (журнал импортов)
    const importSummary = {
      fileName: fileName || "unknown.csv",
      timestamp: new Date().toISOString(),
      createdPersons: createdPersons.length,
      updatedPersons: updatedPersons.length,
      createdPlots: createdPlots.length,
      updatedPlots: updatedPlots.length,
      skipped: skipped.length,
      errors: errors.length,
      actorRole: user.role,
    };

    await logAdminAction({
      action: "registry_import",
      entity: "registry",
      entityId: null,
      after: importSummary,
      meta: { actorUserId: user.id, actorRole: user.role },
      headers: request.headers,
    });

    return ok(request, {
      summary: {
        ...importSummary,
        createdInviteCodes: createdInviteCodes.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Registry CSV import error:", error);
    return serverError(request, "Ошибка импорта CSV", error);
  }
}
