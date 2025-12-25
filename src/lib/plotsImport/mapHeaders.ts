const headerAliases: Record<string, keyof ReturnType<typeof emptyMap>> = {
  улица: "street",
  "участок": "number",
  "номер участка": "number",
  фио: "ownerFullName",
  "фамилия имя отчество": "ownerFullName",
  телефон: "phone",
  почта: "email",
  email: "email",
  статус: "membershipStatus",
  членство: "membershipStatus",
  подтвержден: "isConfirmed",
  подтверждён: "isConfirmed",
  примечание: "notes",
  комментарий: "notes",
};

const emptyMap = () => ({
  street: -1,
  number: -1,
  ownerFullName: -1,
  phone: -1,
  email: -1,
  membershipStatus: -1,
  isConfirmed: -1,
  notes: -1,
});

export const mapHeaders = (rawHeaders: string[]) => {
  const map = emptyMap();
  rawHeaders.forEach((h, idx) => {
    const key = h.trim().toLowerCase();
    const internal = headerAliases[key];
    if (internal !== undefined && map[internal] === -1) {
      map[internal] = idx;
    }
  });
  if (map.street === -1 || map.number === -1) {
    return { error: "Не найдены обязательные колонки: улица и участок", map: null };
  }
  return { map, error: null };
};

