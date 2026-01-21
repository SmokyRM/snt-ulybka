import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, normalizeRole } from "@/lib/rbac";
import { getPlots } from "@/lib/mockDb";
import { listAppeals } from "@/lib/appeals.store";
import { forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

type IssueType =
  | "plots_without_owner"
  | "owners_without_phone"
  | "verification_not_verified"
  | "duplicate_phones"
  | "appeals_without_plotId";

type QualityIssue = {
  id: string;
  type: IssueType;
  plotId: string | null;
  plotNumber: string;
  ownerName: string | null;
  phone: string | null;
  email: string | null;
  verificationStatus: "draft" | "pending" | "verified" | null;
  appealId?: string | null;
  appealTitle?: string | null;
  duplicateCount?: number;
};

function mapPlotStatusToVerificationStatus(status?: string | null): "draft" | "pending" | "verified" | null {
  if (!status) return null;
  if (status === "VERIFIED" || status === "active") return "verified";
  if (status === "CLAIMED" || status === "INVITE_READY") return "pending";
  if (status === "DRAFT") return "draft";
  return null;
}

export async function GET(request: Request) {
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
    const url = new URL(request.url);
    const issueType = url.searchParams.get("issueType") as IssueType | null;

    const plots = getPlots();
    const appeals = listAppeals({});

    // Build plot lookup by plotNumber
    const plotByNumber = new Map<string, typeof plots[0]>();
    plots.forEach((plot) => {
      plotByNumber.set(plot.plotNumber, plot);
    });

    // Build phone frequency map
    const phoneFrequency = new Map<string, number>();
    plots.forEach((plot) => {
      if (plot.phone) {
        const normalized = plot.phone.replace(/\D/g, "");
        if (normalized.length >= 10) {
          phoneFrequency.set(normalized, (phoneFrequency.get(normalized) || 0) + 1);
        }
      }
    });

    const allIssues: QualityIssue[] = [];

    // 1. Plots without owner
    if (!issueType || issueType === "plots_without_owner") {
      plots
        .filter((plot) => !plot.ownerFullName)
        .forEach((plot) => {
          allIssues.push({
            id: `no-owner-${plot.id}`,
            type: "plots_without_owner",
            plotId: plot.id,
            plotNumber: plot.plotNumber,
            ownerName: null,
            phone: plot.phone || null,
            email: plot.email || null,
            verificationStatus: mapPlotStatusToVerificationStatus(plot.status),
          });
        });
    }

    // 2. Owners without phone
    if (!issueType || issueType === "owners_without_phone") {
      plots
        .filter((plot) => plot.ownerFullName && !plot.phone)
        .forEach((plot) => {
          allIssues.push({
            id: `no-phone-${plot.id}`,
            type: "owners_without_phone",
            plotId: plot.id,
            plotNumber: plot.plotNumber,
            ownerName: plot.ownerFullName || null,
            phone: null,
            email: plot.email || null,
            verificationStatus: mapPlotStatusToVerificationStatus(plot.status),
          });
        });
    }

    // 3. Verification status not verified
    if (!issueType || issueType === "verification_not_verified") {
      plots
        .filter((plot) => {
          const status = mapPlotStatusToVerificationStatus(plot.status);
          return status !== "verified" && status !== null;
        })
        .forEach((plot) => {
          allIssues.push({
            id: `not-verified-${plot.id}`,
            type: "verification_not_verified",
            plotId: plot.id,
            plotNumber: plot.plotNumber,
            ownerName: plot.ownerFullName || null,
            phone: plot.phone || null,
            email: plot.email || null,
            verificationStatus: mapPlotStatusToVerificationStatus(plot.status),
          });
        });
    }

    // 4. Duplicate phones
    if (!issueType || issueType === "duplicate_phones") {
      const duplicatePhones = Array.from(phoneFrequency.entries())
        .filter(([_, count]) => count > 1)
        .map(([phone]) => phone);

      plots.forEach((plot) => {
        if (plot.phone) {
          const normalized = plot.phone.replace(/\D/g, "");
          if (duplicatePhones.includes(normalized)) {
            allIssues.push({
              id: `dup-phone-${plot.id}`,
              type: "duplicate_phones",
              plotId: plot.id,
              plotNumber: plot.plotNumber,
              ownerName: plot.ownerFullName || null,
              phone: plot.phone,
              email: plot.email || null,
              verificationStatus: mapPlotStatusToVerificationStatus(plot.status),
              duplicateCount: phoneFrequency.get(normalized) || 0,
            });
          }
        }
      });
    }

    // 5. Appeals without plotId (if plotNumber exists but plotId not found)
    if (!issueType || issueType === "appeals_without_plotId") {
      appeals.forEach((appeal) => {
        if (appeal.plotNumber) {
          // Check if appeal has plotId (some appeals might have it, some might not)
          // For now, we check if plotNumber exists but plot is not found in registry
          const plot = plotByNumber.get(appeal.plotNumber);
          if (!plot) {
            allIssues.push({
              id: `appeal-no-plot-${appeal.id}`,
              type: "appeals_without_plotId",
              plotId: null,
              plotNumber: appeal.plotNumber,
              ownerName: appeal.authorName || null,
              phone: appeal.authorPhone || null,
              email: null,
              verificationStatus: null,
              appealId: appeal.id,
              appealTitle: appeal.title || null,
            });
          }
        }
      });
    }

    // Count by type
    const counts = {
      plots_without_owner: allIssues.filter((i) => i.type === "plots_without_owner").length,
      owners_without_phone: allIssues.filter((i) => i.type === "owners_without_phone").length,
      verification_not_verified: allIssues.filter((i) => i.type === "verification_not_verified").length,
      duplicate_phones: allIssues.filter((i) => i.type === "duplicate_phones").length,
      appeals_without_plotId: allIssues.filter((i) => i.type === "appeals_without_plotId").length,
    };

    // Filter by issueType if specified
    const filteredIssues = issueType ? allIssues.filter((i) => i.type === issueType) : allIssues;

    return ok(request, {
      counts,
      issues: filteredIssues,
    });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
