export type PaymentDetails = {
  receiver: string;
  inn: string;
  kpp: string;
  account: string;
  bank: string;
  bankInn: string;
  bic: string;
  corr: string;
  address?: string;
  chairman?: string;
  chairmanPhone?: string;
  chairmanEmail?: string;
};

export const PAYMENT_DETAILS: PaymentDetails = {
  receiver: "СК «Улыбка»",
  inn: "7423007708",
  kpp: "745901001",
  account: "40703810407950000058",
  bank: "ПАО «Челиндбанк»",
  bankInn: "7453002182",
  bic: "047501711",
  corr: "30101810400000000711",
  address: "",
  chairman: "",
  chairmanPhone: "",
  chairmanEmail: "",
};
