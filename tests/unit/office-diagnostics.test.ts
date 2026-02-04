import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const getEffectiveSessionUser = vi.fn();

vi.mock("@/lib/session.server", () => ({
  getEffectiveSessionUser: () => getEffectiveSessionUser(),
}));

vi.mock("@/lib/audit", () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

describe("office diagnostics route", () => {
  beforeEach(() => {
    getEffectiveSessionUser.mockReset();
  });

  it("returns 401 for guest", async () => {
    getEffectiveSessionUser.mockResolvedValue(null);
    const { GET } = await import("../../app/api/office/diagnostics/route");
    const res = await GET(new Request("http://localhost/api/office/diagnostics"));
    expect(res.status).toBe(401);
  });

  it("returns ok for admin", async () => {
    getEffectiveSessionUser.mockResolvedValue({ id: "admin-1", role: "admin" });
    const { GET } = await import("../../app/api/office/diagnostics/route");
    const res = await GET(new Request("http://localhost/api/office/diagnostics"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toBeTruthy();
  });
});
