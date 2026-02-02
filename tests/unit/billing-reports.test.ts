import { describe, expect, it } from "vitest";
import {
  buildAccrualsCsv,
  buildDebtorsCsv,
  buildPaymentsCsv,
  buildUnallocatedPaymentsCsv,
} from "@/lib/billing/reports.csv";

describe("billing reports csv", () => {
  it("buildPaymentsCsv keeps header and maps row", () => {
    const csv = buildPaymentsCsv([
      {
        date: "2024-12-01",
        amount: 1500,
        payer: "Иван",
        plot: "Участок 10",
        status: "unallocated",
        allocated: 0,
        remaining: 1500,
      },
    ]);
    const [header, row] = csv.split("\n");
    expect(header).toBe("date,amount,payer,plot,status,allocated,remaining");
    expect(row).toBe("2024-12-01,1500,Иван,Участок 10,unallocated,0,1500");
  });

  it("buildAccrualsCsv keeps header and maps row", () => {
    const csv = buildAccrualsCsv([
      {
        date: "2024-12-02",
        plot: "Участок 5",
        title: "Членский взнос",
        amount: 2000,
        paid: 500,
        remaining: 1500,
        status: "partially_paid",
      },
    ]);
    const [header, row] = csv.split("\n");
    expect(header).toBe("date,plot,title,amount,paid,remaining,status");
    expect(row).toBe("2024-12-02,Участок 5,Членский взнос,2000,500,1500,partially_paid");
  });

  it("buildDebtorsCsv keeps header and maps row", () => {
    const csv = buildDebtorsCsv([
      { plot: "12", resident: "—", charged: 3000, paid: 1000, debt: 2000 },
    ]);
    const [header, row] = csv.split("\n");
    expect(header).toBe("plot,resident,charged,paid,debt");
    expect(row).toBe("12,—,3000,1000,2000");
  });

  it("buildUnallocatedPaymentsCsv keeps header and maps row", () => {
    const csv = buildUnallocatedPaymentsCsv([
      {
        date: "2024-12-03",
        amount: 900,
        payer: "Пётр",
        plot: "Участок 7",
        status: "unmatched",
        remaining: 900,
      },
    ]);
    const [header, row] = csv.split("\n");
    expect(header).toBe("date,amount,payer,plot,status,remaining");
    expect(row).toBe("2024-12-03,900,Пётр,Участок 7,unmatched,900");
  });
});
