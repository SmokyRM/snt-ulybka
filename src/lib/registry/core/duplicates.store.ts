import { normalizePhone } from "@/lib/utils/phone";
import type { RegistryPerson } from "@/types/snt";
import { listPersons } from "./persons.store";
import { listPlots } from "./plots.store";

export type DuplicateGroupType = "phone" | "name_plot";

export type DuplicateGroup = {
  key: string;
  type: DuplicateGroupType;
  label: string;
  persons: RegistryPerson[];
  meta?: Record<string, unknown>;
};

const normalizeName = (value: string | null | undefined): string => {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

export const listDuplicateGroups = (type?: DuplicateGroupType): DuplicateGroup[] => {
  const persons = listPersons();
  const plots = listPlots();
  const plotById = new Map(plots.map((plot) => [plot.id, plot]));
  const groups: DuplicateGroup[] = [];

  if (!type || type === "phone") {
    const phoneGroups = new Map<string, RegistryPerson[]>();
    persons.forEach((person) => {
      const normalized = normalizePhone(person.phone);
      if (!normalized) return;
      const list = phoneGroups.get(normalized) ?? [];
      list.push(person);
      phoneGroups.set(normalized, list);
    });

    phoneGroups.forEach((items, normalized) => {
      if (items.length < 2) return;
      groups.push({
        key: `phone:${normalized}`,
        type: "phone",
        label: `Телефон ${normalized}`,
        persons: items,
        meta: { normalized },
      });
    });
  }

  if (!type || type === "name_plot") {
    const namePlotGroups = new Map<string, RegistryPerson[]>();
    persons.forEach((person) => {
      const normalizedName = normalizeName(person.fullName);
      if (!normalizedName) return;
      const plotIds = person.plots.length
        ? person.plots
        : plots.filter((plot) => plot.personId === person.id).map((plot) => plot.id);
      plotIds.forEach((plotId) => {
        const key = `${normalizedName}|${plotId}`;
        const list = namePlotGroups.get(key) ?? [];
        list.push(person);
        namePlotGroups.set(key, list);
      });
    });

    namePlotGroups.forEach((items, key) => {
      if (items.length < 2) return;
      const [namePart, plotId] = key.split("|");
      const plot = plotById.get(plotId);
      const plotLabel = plot
        ? `Линия ${plot.sntStreetNumber}, участок ${plot.plotNumber}`
        : `Участок ${plotId}`;
      const displayName = items[0]?.fullName || namePart;
      groups.push({
        key: `name_plot:${key}`,
        type: "name_plot",
        label: `ФИО ${displayName} • ${plotLabel}`,
        persons: items,
        meta: { normalizedName: namePart, plotId, plotLabel },
      });
    });
  }

  return groups;
};

export const getDuplicateGroupByKey = (key: string): DuplicateGroup | null => {
  const all = listDuplicateGroups();
  return all.find((group) => group.key === key) ?? null;
};
