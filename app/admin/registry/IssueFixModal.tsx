"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DataIssue } from "@/lib/registry/core/issues.store";
import { listPlots } from "@/lib/registry/core";
import BulkMergeModal from "./BulkMergeModal";
import { readOk } from "@/lib/api/client";

interface IssueFixModalProps {
  issue: DataIssue;
  onClose: () => void;
  onFixed: () => void;
}

export default function IssueFixModal({ issue, onClose, onFixed }: IssueFixModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBulkMerge, setShowBulkMerge] = useState(false);
  const [formData, setFormData] = useState({
    fullName: issue.person.fullName || "",
    phone: issue.person.phone || "",
    email: issue.person.email || "",
  });

  const plots = listPlots({ personId: issue.personId });
  const relatedPersons = issue.relatedPersonIds
    ? issue.relatedPersonIds.map((id) => {
        // We'd need to fetch these, but for now we'll show IDs
        return { id, fullName: "..." };
      })
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/registry/persons/${issue.personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
        }),
      });

      await readOk<{ person: { id: string } }>(res);

      router.refresh();
      onFixed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAsIs = async () => {
    // For some issues, we can just confirm that it's OK
    // This would mark the issue as resolved without changes
    onFixed();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Исправление проблемы</h3>
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

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-sm font-semibold text-zinc-700 mb-1">Тип проблемы:</div>
              <div className="text-sm text-zinc-900">{issue.description}</div>
            </div>

            {issue.type === "duplicate_phone" || issue.type === "name_conflict" ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="text-sm font-semibold text-amber-900 mb-2">
                    Обнаружены дубликаты или конфликты
                  </div>
                  <div className="text-sm text-amber-800">
                    {issue.relatedPersonIds?.length || 0} связанных записей
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkMerge(true)}
                  className="w-full rounded border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
                >
                  Объединить дубликаты
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-zinc-800">
                      ФИО {issue.type === "empty_fullname" && <span className="text-red-600">*</span>}
                    </span>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required={issue.type === "empty_fullname"}
                      className="rounded border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-zinc-800">
                      Телефон {issue.type === "empty_phone" && <span className="text-red-600">*</span>}
                    </span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required={issue.type === "empty_phone"}
                      className="rounded border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-sm font-medium text-zinc-800">Email</span>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="rounded border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                {plots.length === 0 && issue.type === "empty_plots" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="text-sm text-amber-900">
                      ⚠️ Нет привязанных участков. Участки нужно добавить через импорт или вручную.
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
                  >
                    {loading ? "Сохранение..." : "Сохранить"}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAsIs}
                    className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Подтвердить как есть
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {showBulkMerge && issue.relatedPersonIds && (
        <BulkMergeModal
          primaryPersonId={issue.personId}
          duplicatePersonIds={issue.relatedPersonIds}
          onClose={() => setShowBulkMerge(false)}
          onMerged={onFixed}
        />
      )}
    </>
  );
}
