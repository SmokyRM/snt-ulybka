import { getSessionUser, hasImportAccess } from "@/lib/session.server";
import { getPlots, updatePlotStatus, upsertRegistryPlot } from "@/lib/mockDb";
import type { Plot } from "@/types/snt";
import { fail, forbidden, ok, serverError } from "@/lib/api/respond";

type IncomingRow = {
  cadastral?: string;
  plotNumber?: string;
  street?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  membershipStatus: "member" | "not_member" | "unknown";
  confirmed: boolean;
};

const normalizeDigits = (value: string) => value.replace(/\D/g, "");
const validatePhone = (value?: string) => {
  if (!value) return null;
  const digits = normalizeDigits(value);
  if (digits.length !== 11 || (digits[0] !== "7" && digits[0] !== "8")) {
    return "invalid_phone";
  }
  return null;
};
const validateEmail = (value?: string) => {
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "invalid_email";
  return null;
};

const mapMembershipStatus = (value: IncomingRow["membershipStatus"]): Plot["membershipStatus"] => {
  if (value === "member") return "MEMBER";
  if (value === "not_member") return "NON_MEMBER";
  return "UNKNOWN";
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!hasImportAccess(user)) {
    return forbidden(request);
  }

  try {
    const body = (await request.json().catch(() => null)) as { rows?: IncomingRow[] } | null;
    if (!body || !Array.isArray(body.rows)) {
      return fail(request, "validation_error", "invalid_body", 400);
    }

    const plots = getPlots();
    let created = 0;
    let updated = 0;

    for (const row of body.rows) {
      const phoneError = validatePhone(row.phone);
      if (phoneError) {
        return fail(request, "validation_error", "invalid_phone", 400);
      }
      const emailError = validateEmail(row.email);
      if (emailError) {
        return fail(request, "validation_error", "invalid_email", 400);
      }
    }

    for (const row of body.rows) {
      const cadastral = row.cadastral?.trim() || null;
      const plotNumber = row.plotNumber?.trim() || "";
      if (!cadastral && !plotNumber) {
        continue;
      }
      const existing = cadastral
        ? plots.find((p) => (p.cadastral || "").toLowerCase() === cadastral.toLowerCase())
        : plots.find((p) => p.plotNumber === plotNumber);

      if (existing) {
        updatePlotStatus(existing.id, {
          street: row.street?.trim() || existing.street,
          plotNumber: plotNumber || existing.plotNumber,
          ownerFullName: row.ownerName?.trim() || existing.ownerFullName,
          phone: row.phone ? normalizeDigits(row.phone) : existing.phone,
          email: row.email?.trim() || existing.email,
          membershipStatus: mapMembershipStatus(row.membershipStatus),
          isConfirmed: row.confirmed,
          cadastral: cadastral || existing.cadastral,
        });
        updated += 1;
      } else {
        const display = row.street
          ? `${row.street.trim()}, участок ${plotNumber}`
          : `участок ${plotNumber}`;
        const createdPlot = upsertRegistryPlot({
          plotDisplay: display,
          cadastral,
          seedOwnerName: row.ownerName?.trim() || null,
          seedOwnerPhone: row.phone ? normalizeDigits(row.phone) : null,
        });
        if (createdPlot) {
          updatePlotStatus(createdPlot.id, {
            street: row.street?.trim() || createdPlot.street,
            plotNumber: plotNumber || createdPlot.plotNumber,
            ownerFullName: row.ownerName?.trim() || createdPlot.ownerFullName,
            phone: row.phone ? normalizeDigits(row.phone) : createdPlot.phone,
            email: row.email?.trim() || createdPlot.email,
            membershipStatus: mapMembershipStatus(row.membershipStatus),
            isConfirmed: row.confirmed,
            cadastral: cadastral || createdPlot.cadastral,
          });
          created += 1;
        }
      }
    }

    return ok(request, { created, updated });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
