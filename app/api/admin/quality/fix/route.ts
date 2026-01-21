import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, normalizeRole } from "@/lib/rbac";
import { findPlotById, updatePlotStatus } from "@/lib/mockDb";
import { badRequest, fail, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

const normalizePhone = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length < 10) return null;
  return cleaned;
};

export async function POST(request: Request) {
  // Check production if needed
  if (process.env.DISABLE_QUALITY_PAGE === "true") {
    return forbidden(request, "Quality page is disabled");
  }

  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }

  const normalizedRole = normalizeRole(user.role);
  if (!isAdminRole(normalizedRole)) {
    return forbidden(request);
  }

  try {
    const body = (await request.json()) as {
      action: "update_phone" | "set_verification_status";
      plotId: string;
      phone?: string | null;
      verificationStatus?: "pending" | "verified";
    };

    const { action, plotId, phone, verificationStatus } = body;

    if (!plotId) {
      return badRequest(request, "plotId is required");
    }

    const plot = findPlotById(plotId);
    if (!plot) {
      return fail(request, "not_found", "plot not found", 404);
    }

    if (action === "update_phone") {
      const normalizedPhone = normalizePhone(phone);
      const updated = updatePlotStatus(plotId, {
        phone: normalizedPhone,
      });
      if (!updated) {
        return serverError(request, "failed to update plot");
      }
      return ok(request, { plot: updated });
    }

    if (action === "set_verification_status") {
      if (!verificationStatus || (verificationStatus !== "pending" && verificationStatus !== "verified")) {
        return badRequest(request, "invalid verificationStatus");
      }

      // Map verification status to plot status
      const plotStatus = verificationStatus === "verified" ? "VERIFIED" : verificationStatus === "pending" ? "CLAIMED" : plot.status;

      const updated = updatePlotStatus(plotId, {
        status: plotStatus,
      });
      if (!updated) {
        return serverError(request, "failed to update plot");
      }
      return ok(request, { plot: updated });
    }

    return badRequest(request, "invalid action");
  } catch {
    return badRequest(request, "invalid json");
  }
}
