import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { promises as fs } from "fs";
import { join } from "path";
import { badRequest, fail, forbidden, ok, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    // RBAC: admin only
    const user = await getSessionUser();
    if (!user || !hasAdminAccess(user)) {
      return forbidden(request, "forbidden");
    }

    // CSRF protection
    const originCheck = verifySameOrigin(request);
    if (!originCheck.ok) {
      return forbidden(request, "origin check failed");
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("id");

    if (!reportId) {
      return badRequest(request, "id parameter is required");
    }

    // Sanitize reportId to prevent directory traversal
    if (reportId.includes("..") || reportId.includes("/") || reportId.includes("\\")) {
      return badRequest(request, "invalid report id");
    }

    const reportsDir = join(process.cwd(), "tmp", "qa-reports");
    const filePath = join(reportsDir, `${reportId}.json`);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const report = JSON.parse(content);
      
      return ok(request, report);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return fail(request, "not_found", "report not found", 404);
      }
      throw error;
    }
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
