import { describe, it, expect, beforeEach, vi } from "vitest";

// Динамический импорт для избежания проблем с путями
async function getHealthzHandler() {
  const healthzModule = await import("../../app/api/healthz/route");
  return healthzModule.GET;
}

// Mock dependencies
vi.mock("@/lib/mockDb", () => ({
  getDb: vi.fn(() => ({
    settings: [
      {
        key: "payment_details",
        value: { receiver: "Test" },
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ],
  })),
  getSetting: vi.fn(() => ({
    key: "payment_details",
    value: { receiver: "Test" },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  })),
}));

describe("GET /api/healthz", () => {
  let GET: (request: Request) => Promise<Response>;
  
  beforeEach(async () => {
    // Reset env
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    delete process.env.GIT_SHA;
    process.env.NODE_ENV = "test";
    
    // Динамический импорт
    GET = await getHealthzHandler();
  });

  it("should return 200 with ok: true when all components are healthy", async () => {
    // Set required env
    process.env.NODE_ENV = "test";

    const request = new Request("http://localhost/api/healthz");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data).toBeDefined();

    const data = json.data;
    expect(data.healthy).toBe(true);
    expect(data.time).toBeDefined();
    expect(data.components).toBeDefined();
    expect(data.components.database).toBeDefined();
    expect(data.components.database.ok).toBe(true);
    expect(data.components.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(data.components.environment).toBeDefined();
    expect(data.components.environment.ok).toBe(true);
    expect(data.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should include version and commit if available", async () => {
    process.env.NEXT_PUBLIC_APP_VERSION = "1.0.0";
    process.env.GIT_SHA = "abc123";

    const request = new Request("http://localhost/api/healthz");
    const response = await GET(request);
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.data.version).toBe("1.0.0");
    expect(json.data.commit).toBe("abc123");
  });

  it("should not include version and commit if not set", async () => {
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    delete process.env.GIT_SHA;

    const request = new Request("http://localhost/api/healthz");
    const response = await GET(request);
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.data.version).toBeUndefined();
    expect(json.data.commit).toBeUndefined();
  });

  it("should include uptimeSeconds", async () => {
    const request = new Request("http://localhost/api/healthz");
    const response = await GET(request);
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(typeof json.data.uptimeSeconds).toBe("number");
  });

  it("should return valid ISO timestamp", async () => {
    const request = new Request("http://localhost/api/healthz");
    const response = await GET(request);
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.data.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(new Date(json.data.time).getTime()).not.toBeNaN();
  });
});
