import { ok, unauthorized, forbidden } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, normalizeRole } from "@/lib/rbac";
import { getAdminDashboardData } from "@/lib/adminDashboard";
import { getPlots, listRegistryImports } from "@/lib/mockDb";
import { listAppeals } from "@/lib/appeals.store";
import { isOverdue } from "@/lib/appealsSla";

function mapPlotStatusToVerificationStatus(status?: string | null): "draft" | "pending" | "verified" | null {
  if (!status) return null;
  if (status === "VERIFIED" || status === "active") return "verified";
  if (status === "CLAIMED" || status === "INVITE_READY") return "pending";
  if (status === "DRAFT") return "draft";
  return null;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);

  const normalizedRole = normalizeRole(user.role);
  if (!isAdminRole(normalizedRole)) {
    return forbidden(request);
  }

  const dashboardData = getAdminDashboardData();
  const plots = getPlots();
  const appeals = listAppeals({});

  // Registry stats
  const totalPlots = plots.length;
  const verifiedPlots = plots.filter((p) => mapPlotStatusToVerificationStatus(p.status) === "verified").length;
  const missingOwnerPlots = plots.filter((p) => !p.ownerFullName).length;
  const missingPhonePlots = plots.filter((p) => p.ownerFullName && !p.phone).length;

  // Appeals stats
  const openAppeals = appeals.filter((a) => a.status !== "closed");
  const totalOpen = openAppeals.length;
  const overdueAppeals = openAppeals.filter((a) => isOverdue(a.dueAt, a.status)).length;

  // Last import summary
  const registryImports = listRegistryImports();
  const lastRegistryImport = registryImports[0] || null;

  // Top quality issues (limit to top 5 by count)
  const qualityIssues = {
    plots_without_owner: missingOwnerPlots,
    owners_without_phone: missingPhonePlots,
    verification_not_verified: plots.filter((p) => {
      const status = mapPlotStatusToVerificationStatus(p.status);
      return status !== "verified" && status !== null;
    }).length,
    duplicate_phones: (() => {
      const phoneFrequency = new Map<string, number>();
      plots.forEach((plot) => {
        if (plot.phone) {
          const normalized = plot.phone.replace(/\D/g, "");
          if (normalized.length >= 10) {
            phoneFrequency.set(normalized, (phoneFrequency.get(normalized) || 0) + 1);
          }
        }
      });
      return Array.from(phoneFrequency.values()).filter((count) => count > 1).length;
    })(),
    appeals_without_plotId: appeals.filter((a) => {
      if (!a.plotNumber) return false;
      const plot = plots.find((p) => p.plotNumber === a.plotNumber);
      return !plot;
    }).length,
  };

  const topIssues = Object.entries(qualityIssues)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return ok(request, {
    ...dashboardData,
    registry: {
      ...dashboardData.registry,
      totalPlots,
      verifiedPlots,
      missingOwnerPlots,
      missingPhonePlots,
    },
    appeals: {
      totalOpen,
      overdue: overdueAppeals,
    },
    lastRegistryImport: lastRegistryImport
      ? {
          id: lastRegistryImport.id,
          createdAt: lastRegistryImport.createdAt,
          fileName: lastRegistryImport.fileName,
          summary: lastRegistryImport.summary,
          errorsCount: lastRegistryImport.errorsCount,
        }
      : null,
    topQualityIssues: topIssues,
  });
}
