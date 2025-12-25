export const categoryForAccrualType = (type: string) => {
  if (type === "electricity") return "electricity";
  if (type === "target_fee") return "target_fee";
  return "membership_fee";
};

export const classifyPurposeCategory = (purpose?: string | null) => {
  const text = (purpose ?? "").toLowerCase();
  const targetKeywords = ["целев", "дорог", "шлагбаум", "ворота", "скважин", "освещ"];
  if (targetKeywords.some((k) => text.includes(k))) return "target_fee";
  if (text.includes("электро") || text.includes("энерг")) return "electricity";
  return "membership_fee";
};
