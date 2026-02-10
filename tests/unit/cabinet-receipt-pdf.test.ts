import { beforeEach, describe, expect, it, vi } from "vitest";

const getEffectiveSessionUser = vi.fn();
const buildResidentBillingSummary = vi.fn();
const uploadOfficeDocumentFile = vi.fn();
const createOfficeDocument = vi.fn();

vi.mock("@/lib/session.server", () => ({
  getEffectiveSessionUser: () => getEffectiveSessionUser(),
}));

vi.mock("@/lib/cabinet/billing.server", () => ({
  buildResidentBillingSummary: (...args: unknown[]) => buildResidentBillingSummary(...args),
}));

vi.mock("@/lib/office/documentUpload.server", () => ({
  uploadOfficeDocumentFile: (...args: unknown[]) => uploadOfficeDocumentFile(...args),
}));

vi.mock("@/lib/office/documentsRegistry.store", () => ({
  createOfficeDocument: (...args: unknown[]) => createOfficeDocument(...args),
}));

describe("cabinet receipt pdf route", () => {
  beforeEach(() => {
    getEffectiveSessionUser.mockReset();
    buildResidentBillingSummary.mockReset();
    uploadOfficeDocumentFile.mockReset();
    createOfficeDocument.mockReset();
  });

  it("returns pdf attachment for resident", async () => {
    getEffectiveSessionUser.mockResolvedValue({
      id: "resident-1",
      role: "resident",
      fullName: "Тестовый Житель",
    });
    buildResidentBillingSummary.mockReturnValue({
      totalAccrued: 1000,
      totalPaid: 500,
      totalDebt: 500,
      penalty: 0,
      plotId: "plot-1",
      plotLabel: "Участок 1",
      periods: [{ period: "2026-01", accrued: 1000, paid: 500, debt: 500 }],
    });
    uploadOfficeDocumentFile.mockResolvedValue({ fileName: "receipt.pdf", fileUrl: "/uploads/receipt.pdf" });
    createOfficeDocument.mockReturnValue({ id: "doc-1" });

    const { GET } = await import("../../app/api/cabinet/receipts/[period].pdf/route");
    const res = await GET(new Request("http://localhost/api/cabinet/receipts/2026-01.pdf"), {
      params: { period: "2026-01" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("attachment;");
  });
});
