import fs from "fs/promises";
import path from "path";

export type PaymentDetails = {
  recipientName: string;
  inn: string;
  kpp: string;
  account: string;
  bank: string;
  bik: string;
  corrAccount: string;
};

const defaults: PaymentDetails = {
  recipientName: "СК «Улыбка»",
  inn: "7423007708",
  kpp: "745901001",
  account: "40703810407950000058",
  bank: "ПАО «Челиндбанк»",
  bik: "047501711",
  corrAccount: "30101810400000000711",
};

const filePath = path.join(process.cwd(), "data", "payment-details.json");

export async function getPaymentDetails(): Promise<PaymentDetails> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<PaymentDetails>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}
