import { describe, it, expect, vi, beforeEach } from "vitest";

const logStructured = vi.fn();

vi.mock("@/lib/structuredLogger/node", () => ({
  logStructured: (...args: unknown[]) => logStructured(...args),
}));

describe("measure", () => {
  beforeEach(() => {
    logStructured.mockReset();
  });

  it("logs warn when duration exceeds threshold", async () => {
    const { measure } = await import("@/lib/perf/measure");
    const spy = vi.spyOn(Date, "now");
    spy.mockReturnValueOnce(0).mockReturnValueOnce(1200);
    await measure("slow-op", async () => "ok", { route: "/test" }, { thresholdMs: 800 });
    expect(logStructured).toHaveBeenCalled();
    const [level, payload] = logStructured.mock.calls[0];
    expect(level).toBe("warn");
    expect((payload as { name?: string }).name).toBe("slow-op");
    spy.mockRestore();
  });

  it("does not log for fast calls when DEBUG_PERF is false", async () => {
    const prev = process.env.DEBUG_PERF;
    process.env.DEBUG_PERF = "false";
    const { measure } = await import("@/lib/perf/measure");
    const spy = vi.spyOn(Date, "now");
    spy.mockReturnValueOnce(0).mockReturnValueOnce(10);
    await measure("fast-op", async () => "ok");
    expect(logStructured).not.toHaveBeenCalled();
    spy.mockRestore();
    process.env.DEBUG_PERF = prev;
  });

  it("logs when DEBUG_PERF is true even if fast", async () => {
    const prev = process.env.DEBUG_PERF;
    process.env.DEBUG_PERF = "true";
    const { measure } = await import("@/lib/perf/measure");
    const spy = vi.spyOn(Date, "now");
    spy.mockReturnValueOnce(0).mockReturnValueOnce(10);
    await measure("fast-op", async () => "ok");
    expect(logStructured).toHaveBeenCalled();
    spy.mockRestore();
    process.env.DEBUG_PERF = prev;
  });
});
