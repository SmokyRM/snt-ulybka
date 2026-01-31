import { describe, it, expect, vi, beforeEach } from "vitest";
import { requirePermission } from "@/lib/permissionsGuard";

const mockGetEffectiveSessionUser = vi.fn();
const mockLogAuthEvent = vi.fn();
const mockLogAdminAction = vi.fn();

vi.mock("@/lib/session.server", () => ({
  getEffectiveSessionUser: () => mockGetEffectiveSessionUser(),
}));

vi.mock("@/lib/structuredLogger/node", () => ({
  logAuthEvent: (...args: unknown[]) => mockLogAuthEvent(...args),
}));

vi.mock("@/lib/audit", () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

describe("requirePermission", () => {
  beforeEach(() => {
    mockGetEffectiveSessionUser.mockReset();
    mockLogAuthEvent.mockReset();
    mockLogAdminAction.mockReset();
  });

  it("returns 401 when session is missing", async () => {
    mockGetEffectiveSessionUser.mockResolvedValueOnce(null);
    const request = new Request("http://localhost/api/office/billing/import-payments");
    const result = await requirePermission(request, "billing.import");
    expect(result instanceof Response).toBe(true);
    if (result instanceof Response) {
      expect(result.status).toBe(401);
    }
  });

  it("returns 403 when permission denied", async () => {
    mockGetEffectiveSessionUser.mockResolvedValueOnce({ id: "u1", role: "resident" });
    const request = new Request("http://localhost/api/office/billing/import-payments");
    const result = await requirePermission(request, "billing.import");
    expect(result instanceof Response).toBe(true);
    if (result instanceof Response) {
      expect(result.status).toBe(403);
    }
  });
});
