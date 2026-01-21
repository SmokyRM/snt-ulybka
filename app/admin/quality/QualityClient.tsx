"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { readOk } from "@/lib/api/client";

type IssueType =
  | "plots_without_owner"
  | "owners_without_phone"
  | "verification_not_verified"
  | "duplicate_phones"
  | "appeals_without_plotId";

type QualityIssue = {
  id: string;
  type: IssueType;
  plotId: string | null;
  plotNumber: string;
  ownerName: string | null;
  phone: string | null;
  email: string | null;
  verificationStatus: "draft" | "pending" | "verified" | null;
  appealId?: string | null;
  appealTitle?: string | null;
  duplicateCount?: number;
};

type QualityData = {
  counts: Record<IssueType, number>;
  issues: QualityIssue[];
};

const issueLabels: Record<IssueType, string> = {
  plots_without_owner: "Участки без владельца",
  owners_without_phone: "Владельцы без телефона",
  verification_not_verified: "Не подтверждено",
  duplicate_phones: "Дублирующиеся телефоны",
  appeals_without_plotId: "Обращения без участка",
};

const verificationStatusLabels: Record<string, string> = {
  verified: "Подтверждено",
  pending: "На проверке",
  draft: "Черновик",
};

export default function QualityClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssueType, setSelectedIssueType] = useState<IssueType | null>(null);
  const [editingPhone, setEditingPhone] = useState<{ plotId: string; value: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const issueTypeParam = searchParams.get("issueType") as IssueType | null;
    if (issueTypeParam) {
      setSelectedIssueType(issueTypeParam);
      loadData(issueTypeParam);
    } else {
      setSelectedIssueType(null);
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadData = async (issueType?: IssueType) => {
    setLoading(true);
    setError(null);
    try {
      const url = issueType ? `/api/admin/quality?issueType=${issueType}` : "/api/admin/quality";
      const response = await fetch(url);
      const result = await readOk<{ counts: Record<IssueType, number>; issues: QualityIssue[] }>(response);
      setData(result);
      if (issueType) {
        setSelectedIssueType(issueType);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const handleFixPhone = async (plotId: string, phone: string | null) => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/quality/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_phone",
          plotId,
          phone,
        }),
      });

      await readOk<{ plot: { id: string } }>(response);

      // Reload data
      await loadData(selectedIssueType || undefined);
      setEditingPhone(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления");
    } finally {
      setSaving(false);
    }
  };

  const handleSetVerificationStatus = async (plotId: string, status: "pending" | "verified") => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/quality/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_verification_status",
          plotId,
          verificationStatus: status,
        }),
      });

      await readOk<{ plot: { id: string } }>(response);

      // Reload data
      await loadData(selectedIssueType || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-12 shadow-sm">
        <div className="text-sm text-zinc-600">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <div className="font-semibold">Ошибка</div>
        <div>{error}</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const issuesToShow = selectedIssueType ? data.issues : [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(issueLabels) as IssueType[]).map((issueType) => {
          const count = data.counts[issueType] || 0;
          return (
            <button
              key={issueType}
              type="button"
              onClick={() => {
                if (selectedIssueType === issueType) {
                  setSelectedIssueType(null);
                  loadData();
                } else {
                  loadData(issueType);
                }
              }}
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                selectedIssueType === issueType
                  ? "border-[#5E704F] bg-[#5E704F] text-white"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <div className="text-xs opacity-70">{issueLabels[issueType]}</div>
              <div className={`text-3xl font-semibold ${selectedIssueType === issueType ? "text-white" : "text-zinc-900"}`}>
                {count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Issues List */}
      {selectedIssueType && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{issueLabels[selectedIssueType]}</h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedIssueType(null);
                  loadData();
                }}
                className="text-sm text-zinc-600 hover:text-zinc-900"
              >
                Скрыть список
              </button>
            </div>
          </div>

          {issuesToShow.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-600">Проблем не найдено</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участок</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Владелец</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Телефон</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Статус</th>
                    {selectedIssueType === "appeals_without_plotId" && (
                      <th className="px-4 py-3 text-left font-semibold text-zinc-700">Обращение</th>
                    )}
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {issuesToShow.map((issue) => (
                    <tr key={issue.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        {issue.plotId ? (
                          <Link
                            href={`/office/registry/${issue.plotId}`}
                            className="font-semibold text-[#5E704F] underline"
                          >
                            {issue.plotNumber}
                          </Link>
                        ) : (
                          <span className="font-semibold text-zinc-900">{issue.plotNumber}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{issue.ownerName || "—"}</td>
                      <td className="px-4 py-3">
                        {editingPhone?.plotId === issue.plotId ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingPhone.value}
                              onChange={(e) => setEditingPhone({ ...editingPhone, value: e.target.value })}
                              className="w-32 rounded border border-zinc-300 px-2 py-1 text-xs"
                              placeholder="+7..."
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleFixPhone(issue.plotId!, editingPhone.value)}
                              disabled={saving}
                              className="rounded bg-[#5E704F] px-2 py-1 text-xs text-white disabled:opacity-50"
                            >
                              {saving ? "..." : "✓"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPhone(null)}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-700">{issue.phone || "—"}</span>
                            {issue.plotId && (
                              <button
                                type="button"
                                onClick={() => setEditingPhone({ plotId: issue.plotId!, value: issue.phone || "" })}
                                className="text-xs text-[#5E704F] hover:underline"
                              >
                                Изменить
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {issue.verificationStatus ? (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                              issue.verificationStatus === "verified"
                                ? "bg-emerald-100 text-emerald-800"
                                : issue.verificationStatus === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-zinc-100 text-zinc-700"
                            }`}
                          >
                            {verificationStatusLabels[issue.verificationStatus] || issue.verificationStatus}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {selectedIssueType === "appeals_without_plotId" && (
                        <td className="px-4 py-3">
                          {issue.appealId ? (
                            <Link
                              href={`/office/appeals/${issue.appealId}`}
                              className="text-xs text-[#5E704F] underline"
                            >
                              {issue.appealTitle || issue.appealId}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {issue.plotId && (
                            <>
                              <Link
                                href={`/office/registry/${issue.plotId}`}
                                className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
                              >
                                Открыть
                              </Link>
                              {issue.verificationStatus !== "verified" && (
                                <button
                                  type="button"
                                  onClick={() => handleSetVerificationStatus(issue.plotId!, "verified")}
                                  disabled={saving}
                                  className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                                >
                                  Подтвердить
                                </button>
                              )}
                              {issue.verificationStatus !== "pending" && issue.verificationStatus !== "verified" && (
                                <button
                                  type="button"
                                  onClick={() => handleSetVerificationStatus(issue.plotId!, "pending")}
                                  disabled={saving}
                                  className="rounded bg-amber-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                                >
                                  На проверку
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        <Link
          href="/admin/registry"
          className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
        >
          К реестру
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
        >
          Назад
        </Link>
      </div>
    </div>
  );
}
