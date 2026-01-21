"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPerson, listPersons } from "@/lib/registry/core";
import { listPlots } from "@/lib/registry/core";
import { readOk } from "@/lib/api/client";

interface BulkMergeModalProps {
  primaryPersonId: string;
  duplicatePersonIds: string[];
  onClose: () => void;
  onMerged: () => void;
}

export default function BulkMergeModal({
  primaryPersonId,
  duplicatePersonIds,
  onClose,
  onMerged,
}: BulkMergeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(primaryPersonId);
  const [persons, setPersons] = useState<Array<{ id: string; fullName: string; phone: string | null }>>([]);

  useEffect(() => {
    const allIds = [primaryPersonId, ...duplicatePersonIds];
    const loaded = allIds.map((id) => {
      const person = getPerson(id);
      return person
        ? {
            id: person.id,
            fullName: person.fullName,
            phone: person.phone,
          }
        : null;
    }).filter((p): p is NonNullable<typeof p> => p !== null);
    setPersons(loaded.map((p) => ({ ...p, phone: p.phone ?? null })));
  }, [primaryPersonId, duplicatePersonIds]);

  const handleMerge = async () => {
    if (!selectedPersonId) {
      setError("Выберите основную запись");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/registry/persons/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryPersonId: selectedPersonId,
          duplicatePersonIds: duplicatePersonIds.filter((id) => id !== selectedPersonId),
        }),
      });

      await readOk<{ ok: true }>(res);

      router.refresh();
      onMerged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка объединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-lg">
        <div className="border-b border-zinc-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Объединение дубликатов</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="text-sm font-semibold text-amber-900 mb-2">
              ⚠️ Внимание: Объединение удалит дубликаты и перенесет все участки в основную запись
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-zinc-800">Выберите основную запись:</div>
            {persons.map((person) => {
              const plots = listPlots({ personId: person.id });
              return (
                <label
                  key={person.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${
                    selectedPersonId === person.id
                      ? "border-[#5E704F] bg-[#5E704F]/5"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="primaryPerson"
                    value={person.id}
                    checked={selectedPersonId === person.id}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-zinc-900">{person.fullName || "—"}</div>
                    <div className="text-sm text-zinc-600">Телефон: {person.phone || "—"}</div>
                    <div className="text-xs text-zinc-500">Участков: {plots.length}</div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleMerge}
              disabled={loading || !selectedPersonId}
              className="flex-1 rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
            >
              {loading ? "Объединение..." : "Объединить"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
