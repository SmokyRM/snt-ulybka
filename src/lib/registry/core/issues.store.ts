import type { RegistryPerson } from "@/types/snt";
import { normalizePhone } from "@/lib/utils/phone";
import { listPersons } from "./persons.store";
import { listPlots } from "./plots.store";

export type DataIssueType =
  | "empty_fullname"
  | "empty_phone"
  | "empty_plots"
  | "duplicate_phone"
  | "name_conflict";

export interface DataIssue {
  id: string;
  type: DataIssueType;
  personId: string;
  person: RegistryPerson;
  severity: "low" | "medium" | "high";
  description: string;
  relatedPersonIds?: string[]; // For duplicates and conflicts
  metadata?: Record<string, unknown>;
}

export interface IssueSummary {
  total: number;
  byType: Record<DataIssueType, number>;
  bySeverity: { low: number; medium: number; high: number };
}

export function detectIssues(): {
  issues: DataIssue[];
  summary: IssueSummary;
} {
  const persons = listPersons();
  const plots = listPlots();
  const issues: DataIssue[] = [];

  // Build person -> plots mapping
  const personPlotsMap = new Map<string, number>();
  plots.forEach((plot) => {
    personPlotsMap.set(plot.personId, (personPlotsMap.get(plot.personId) || 0) + 1);
  });

  // Build phone -> persons mapping for duplicate detection
  const phoneToPersons = new Map<string, RegistryPerson[]>();
  persons.forEach((person) => {
    const normalized = normalizePhone(person.phone);
    if (!normalized) return;
    if (!phoneToPersons.has(normalized)) {
      phoneToPersons.set(normalized, []);
    }
    phoneToPersons.get(normalized)!.push(person);
  });

  // Detect issues for each person
  persons.forEach((person) => {
    // 1. Empty fullname
    if (!person.fullName || person.fullName.trim().length === 0) {
      issues.push({
        id: `issue-${person.id}-empty-fullname`,
        type: "empty_fullname",
        personId: person.id,
        person,
        severity: "high",
        description: "Отсутствует ФИО",
      });
    }

    // 2. Empty phone
    if (!person.phone || person.phone.trim().length === 0) {
      issues.push({
        id: `issue-${person.id}-empty-phone`,
        type: "empty_phone",
        personId: person.id,
        person,
        severity: "high",
        description: "Отсутствует телефон",
      });
    }

    // 3. Empty plots
    const plotCount = personPlotsMap.get(person.id) || 0;
    if (plotCount === 0) {
      issues.push({
        id: `issue-${person.id}-empty-plots`,
        type: "empty_plots",
        personId: person.id,
        person,
        severity: "medium",
        description: "Нет привязанных участков",
      });
    }

    // 4. Duplicate phone (detected once per group)
    {
      const normalized = normalizePhone(person.phone);
      if (normalized) {
        const personsWithSamePhone = phoneToPersons.get(normalized) || [];
        if (personsWithSamePhone.length > 1) {
          // Only add issue for the first person in the group to avoid duplicates
          if (personsWithSamePhone[0].id === person.id) {
            const relatedIds = personsWithSamePhone
              .slice(1)
              .map((p) => p.id)
              .filter((id) => id !== person.id);
            issues.push({
              id: `issue-${person.id}-duplicate-phone`,
              type: "duplicate_phone",
              personId: person.id,
              person,
              severity: "medium",
              description: `Дубликат телефона (${personsWithSamePhone.length} человек)`,
              relatedPersonIds: relatedIds,
              metadata: {
                phone: normalized,
                count: personsWithSamePhone.length,
              },
            });
          }
        }
      }
    }

    // 5. Name conflict (same phone, different names)
    {
      const normalized = normalizePhone(person.phone);
      if (normalized) {
        const personsWithSamePhone = phoneToPersons.get(normalized) || [];
        if (personsWithSamePhone.length > 1) {
          const uniqueNames = new Set(
            personsWithSamePhone.map((p) => p.fullName.trim().toLowerCase())
          );
          if (uniqueNames.size > 1) {
            // Only add issue for the first person in the group
            if (personsWithSamePhone[0].id === person.id) {
              const conflictingPersons = personsWithSamePhone.filter(
                (p) => p.fullName.trim().toLowerCase() !== person.fullName.trim().toLowerCase()
              );
              issues.push({
                id: `issue-${person.id}-name-conflict`,
                type: "name_conflict",
                personId: person.id,
                person,
                severity: "high",
                description: `Конфликт ФИО: один телефон, разные имена (${uniqueNames.size} варианта)`,
                relatedPersonIds: conflictingPersons.map((p) => p.id),
                metadata: {
                  phone: normalized,
                  names: Array.from(uniqueNames),
                },
              });
            }
          }
        }
      }
    }
  });

  // Build summary
  const summary: IssueSummary = {
    total: issues.length,
    byType: {
      empty_fullname: 0,
      empty_phone: 0,
      empty_plots: 0,
      duplicate_phone: 0,
      name_conflict: 0,
    },
    bySeverity: { low: 0, medium: 0, high: 0 },
  };

  issues.forEach((issue) => {
    summary.byType[issue.type]++;
    summary.bySeverity[issue.severity]++;
  });

  return { issues, summary };
}

export function filterIssues(
  issues: DataIssue[],
  filters?: {
    type?: DataIssueType;
    severity?: "low" | "medium" | "high";
    personId?: string;
  }
): DataIssue[] {
  let result = [...issues];

  if (filters?.type) {
    result = result.filter((issue) => issue.type === filters.type);
  }

  if (filters?.severity) {
    result = result.filter((issue) => issue.severity === filters.severity);
  }

  if (filters?.personId) {
    const personId = filters.personId;
    result = result.filter(
      (issue) =>
        issue.personId === personId ||
        issue.relatedPersonIds?.includes(personId)
    );
  }

  return result;
}
