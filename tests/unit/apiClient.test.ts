import { describe, expect, it, vi, afterEach } from "vitest";
import { ApiError, apiGet, apiPost, readOk, readRaw } from "@/lib/api/client";

describe("api client helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("readOk returns data on success", async () => {
    const res = new Response(JSON.stringify({ ok: true, data: { value: 42 } }), { status: 200 });
    const data = await readOk<{ value: number }>(res);
    expect(data.value).toBe(42);
  });

  it("readOk throws ApiError on error response", async () => {
    const resA = new Response(
      JSON.stringify({ ok: false, error: { code: "bad_request", message: "Bad" } }),
      { status: 400 }
    );
    const resB = new Response(
      JSON.stringify({ ok: false, error: { code: "bad_request", message: "Bad" } }),
      { status: 400 }
    );
    await expect(readOk(resA)).rejects.toBeInstanceOf(ApiError);
    await expect(readOk(resB)).rejects.toMatchObject({ message: "Bad", status: 400 });
  });

  it("readRaw parses JSON on success", async () => {
    const res = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const data = await readRaw<{ ok: boolean }>(res);
    expect(data.ok).toBe(true);
  });

  it("apiGet propagates ApiError", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: { code: "oops", message: "Nope" } }), { status: 403 })
    );
    await expect(apiGet("/api/test")).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("apiPost returns data from readOk", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { id: "1" } }), { status: 200 })
    );
    const data = await apiPost<{ id: string }>("/api/test", { name: "x" });
    expect(data.id).toBe("1");
    expect(fetchMock).toHaveBeenCalled();
  });
});
