import { Plot } from "@/types/snt";

type RawRow = Partial<{
  street: string;
  number: string;
  ownerFullName: string | null;
  phone: string | null;
  email: string | null;
  membershipStatus: string;
  isConfirmed: string | boolean | number | null;
  notes: string | null;
}>;

const membershipMap: Record<string, Plot["membershipStatus"]> = {
  member: "MEMBER",
  "член": "MEMBER",
  non_member: "NON_MEMBER",
  "non-member": "NON_MEMBER",
  "не член": "NON_MEMBER",
  none: "UNKNOWN",
  unknown: "UNKNOWN",
  "не определен": "UNKNOWN",
  "не определено": "UNKNOWN",
};

const normalizeBool = (value: RawRow["isConfirmed"]): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes" || v === "да";
  }
  return false;
};

export const normalizeRow = (row: RawRow) => {
  const street = row.street?.trim() ?? "";
  const number = row.number?.trim() ?? "";
  const ownerFullName = row.ownerFullName?.trim() || null;
  const phone = row.phone?.trim() || null;
  const email = row.email?.trim() || null;
  const notes = row.notes?.trim() || null;

  const rawStatus = row.membershipStatus?.toString().trim().toLowerCase() ?? "unknown";
  const membershipStatus = membershipMap[rawStatus] ?? "UNKNOWN";

  const isConfirmed = normalizeBool(row.isConfirmed);

  const errors: string[] = [];
  if (!street) errors.push("Отсутствует street");
  if (!number) errors.push("Отсутствует number");

  return {
    normalized: {
      street,
      number,
      ownerFullName,
      phone,
      email,
      membershipStatus,
      isConfirmed,
      notes,
    },
    errors,
  };
};

