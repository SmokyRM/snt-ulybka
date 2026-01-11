export const isPlaceholderPhone = (phone?: string | null) => {
  if (!phone) return true;
  const normalized = phone.replace(/\D+/g, "");
  if (!normalized) return true;
  // Placeholder patterns: all zeros or ends with long zero tail.
  return /^(0+|70000000000|79000000000)$/.test(normalized) || normalized.endsWith("0000000");
};

export const formatPhoneDisplay = (phone?: string | null) => {
  if (!phone || isPlaceholderPhone(phone)) return "Телефон уточняется";
  return phone;
};
