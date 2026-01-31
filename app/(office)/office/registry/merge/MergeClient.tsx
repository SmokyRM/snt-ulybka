"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api/client";
import type { RegistryPerson } from "@/types/snt";

type Props = {
  groupKey: string;
  persons: RegistryPerson[];
};

const uniqueValues = (values: Array<string | null | undefined>) => {
  const set = new Set<string>();
  values.forEach((value) => {
    if (value && value.trim()) {
      set.add(value.trim());
    }
  });
  return Array.from(set);
};

export default function MergeClient({ groupKey, persons }: Props) {
  const router = useRouter();
  const [primaryId, setPrimaryId] = useState(persons[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<{
    fullName?: string;
    phone?: string;
    email?: string;
  }>({});

  const personById = useMemo(() => new Map(persons.map((p) => [p.id, p])), [persons]);
  const primaryPerson = primaryId ? personById.get(primaryId) : undefined;

  const fullNameOptions = useMemo(() => uniqueValues(persons.map((p) => p.fullName)), [persons]);
  const phoneOptions = useMemo(() => uniqueValues(persons.map((p) => p.phone)), [persons]);
  const emailOptions = useMemo(() => uniqueValues(persons.map((p) => p.email)), [persons]);

  const currentValues = {
    fullName: fieldValues.fullName ?? primaryPerson?.fullName ?? "",
    phone: fieldValues.phone ?? primaryPerson?.phone ?? "",
    email: fieldValues.email ?? primaryPerson?.email ?? "",
  };

  const handleMerge = async () => {
    if (!primaryId) {
      setError("Выберите основную запись.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/registry/merge", {
        primaryId,
        secondaryIds: persons.map((p) => p.id).filter((id) => id !== primaryId),
        values: {
          fullName: currentValues.fullName || null,
          phone: currentValues.phone || null,
          email: currentValues.email || null,
        },
        groupKey,
      });
      router.push("/office/registry/duplicates");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка объединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="office-registry-merge-root">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Выберите основную запись</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="office-registry-merge-primary-select">
          {persons.map((person) => (
            <label
              key={person.id}
              className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                primaryId === person.id
                  ? "border-[#5E704F] bg-[#5E704F]/5"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <input
                type="radio"
                name="primary"
                value={person.id}
                checked={primaryId === person.id}
                onChange={(event) => setPrimaryId(event.target.value)}
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-zinc-900">{person.fullName || "—"}</div>
                <div className="text-xs text-zinc-600">Телефон: {person.phone || "—"}</div>
                <div className="text-xs text-zinc-600">Email: {person.email || "—"}</div>
                <div className="text-[11px] text-zinc-400">ID: {person.id}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Какие данные оставить</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-zinc-600">
            ФИО
            <select
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              value={currentValues.fullName}
              onChange={(event) => setFieldValues((prev) => ({ ...prev, fullName: event.target.value }))}
            >
              {fullNameOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-600">
            Телефон
            <select
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              value={currentValues.phone}
              onChange={(event) => setFieldValues((prev) => ({ ...prev, phone: event.target.value }))}
            >
              <option value="">—</option>
              {phoneOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-600">
            Email
            <select
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              value={currentValues.email}
              onChange={(event) => setFieldValues((prev) => ({ ...prev, email: event.target.value }))}
            >
              <option value="">—</option>
              {emailOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={handleMerge}
        disabled={loading}
        className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
        data-testid="office-registry-merge-submit"
      >
        {loading ? "Объединяем..." : "Объединить записи"}
      </button>
    </div>
  );
}
