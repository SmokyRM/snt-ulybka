export type SectionKey =
  | "home"
  | "plots"
  | "finance"
  | "electricity"
  | "charges"
  | "appeals"
  | "docs"
  | "events";

export function cabinetSectionHref(section: SectionKey): string {
  return `/cabinet?section=${encodeURIComponent(section)}`;
}
