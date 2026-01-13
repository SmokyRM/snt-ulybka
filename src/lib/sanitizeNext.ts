export const sanitizeNext = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  if (trimmed.includes("\\")) return null;
  const allowed = ["/", "/office", "/admin", "/cabinet", "/knowledge", "/documents", "/docs"];
  const isAllowed = allowed.some((prefix) => prefix === "/" ? trimmed === "/" : trimmed === prefix || trimmed.startsWith(`${prefix}/`));
  if (!isAllowed) return null;
  return trimmed;
};
