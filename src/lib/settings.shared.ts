export const fallbackSetting = <T>(key: string, defaultValue: T) => ({
  key,
  value: defaultValue,
  createdAt: "",
  updatedAt: "",
});

export const formatAdminTime = (raw?: string | null) => {
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
