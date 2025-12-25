import { MembershipStatus } from "@/types/snt";

const labels: Record<MembershipStatus, string> = {
  UNKNOWN: "Не определён",
  MEMBER: "Член",
  NON_MEMBER: "Не член",
  PENDING: "На проверке",
};

export function membershipLabel(status?: MembershipStatus | null) {
  if (!status) return "—";
  return labels[status] ?? "—";
}
