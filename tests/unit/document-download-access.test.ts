import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOfficeDocument } from "@/lib/office/documentsRegistry.store";

const getEffectiveSessionUser = vi.fn();
const readOfficeDocumentBytes = vi.fn();

vi.mock("@/lib/session.server", () => ({
  getEffectiveSessionUser: () => getEffectiveSessionUser(),
}));

vi.mock("@/lib/office/documentDownload.server", () => ({
  readOfficeDocumentBytes: (...args: unknown[]) => readOfficeDocumentBytes(...args),
}));

describe("cabinet document download access", () => {
  beforeEach(() => {
    getEffectiveSessionUser.mockReset();
    readOfficeDocumentBytes.mockReset();
  });

  it("returns attachment for owner", async () => {
    const doc = createOfficeDocument({
      title: "Owner doc",
      type: "other",
      tags: ["test"],
      isPublic: false,
      accessScope: "resident",
      personId: "resident-a",
      fileName: "owner-doc.pdf",
      fileUrl: "/uploads/owner-doc.pdf",
    });

    getEffectiveSessionUser.mockResolvedValue({ id: "resident-a", role: "resident" });
    readOfficeDocumentBytes.mockResolvedValue({
      body: new Uint8Array([1, 2, 3]),
      mime: "application/pdf",
      fileName: "owner-doc.pdf",
    });

    const { GET } = await import("../../app/api/cabinet/documents/[id]/download/route");
    const res = await GET(new Request(`http://localhost/api/cabinet/documents/${doc.id}/download`), {
      params: Promise.resolve({ id: doc.id }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment;");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns 404 for foreign resident", async () => {
    const doc = createOfficeDocument({
      title: "Private doc",
      type: "other",
      tags: ["test"],
      isPublic: false,
      accessScope: "resident",
      personId: "resident-owner",
      fileName: "private.pdf",
      fileUrl: "/uploads/private.pdf",
    });

    getEffectiveSessionUser.mockResolvedValue({ id: "resident-foreign", role: "resident" });
    readOfficeDocumentBytes.mockResolvedValue({
      body: new Uint8Array([1, 2, 3]),
      mime: "application/pdf",
      fileName: "private.pdf",
    });

    const { GET } = await import("../../app/api/cabinet/documents/[id]/download/route");
    const res = await GET(new Request(`http://localhost/api/cabinet/documents/${doc.id}/download`), {
      params: Promise.resolve({ id: doc.id }),
    });

    expect(res.status).toBe(404);
  });
});
