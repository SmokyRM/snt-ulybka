"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RegistryPerson } from "@/types/snt";
import { readOk } from "@/lib/api/client";

interface EnrichedPerson extends RegistryPerson {
  plotsData: Array<{
    id: string;
    plotNumber: string;
    sntStreetNumber: string;
    cityAddress?: string | null;
  }>;
  inviteCode?: {
    id: string;
    status: "active" | "used" | "revoked" | "expired";
    createdAt: string;
    usedAt?: string | null;
  } | null;
}

interface AdminRegistryClientProps {
  initialPersons: EnrichedPerson[];
  initialQuery?: string;
  initialVerificationStatus?: "not_verified" | "pending" | "verified" | "rejected";
}

export default function AdminRegistryClient({
  initialPersons,
  initialQuery = "",
  initialVerificationStatus,
}: AdminRegistryClientProps) {
  const router = useRouter();
  const [persons, setPersons] = useState<EnrichedPerson[]>(initialPersons);
  const [query, setQuery] = useState(initialQuery);
  const [verificationStatus, setVerificationStatus] = useState<"not_verified" | "pending" | "verified" | "rejected" | "">(
    initialVerificationStatus || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<Record<string, string>>({}); // personId -> code (temporary, after generation)
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({}); // personId -> action

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPersons();
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, verificationStatus]);

  const loadPersons = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (verificationStatus) params.set("verificationStatus", verificationStatus);

      const res = await fetch(`/api/admin/registry?${params.toString()}`);
      const data = await readOk<{ persons?: EnrichedPerson[] }>(res);
      setPersons(data?.persons || []);
    } catch (e) {
      setError((e as Error).message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const formatCode = (code: string): string => {
    // Code is already in format XXXX-XXXX, but ensure it's displayed correctly
    if (code.length === 8 && !code.includes("-")) {
      // Legacy format without dash
      return `${code.slice(0, 4)}-${code.slice(4)}`;
    }
    return code;
  };

  const handleGenerateInviteCode = async (personId: string) => {
    setActionLoading((prev) => ({ ...prev, [personId]: "generate" }));
    try {
      const res = await fetch("/api/admin/registry/invites/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      const data = await readOk<{ code?: string }>(res);
      const code = data?.code;
      if (code) {
        setGeneratedCodes((prev) => ({ ...prev, [personId]: code }));
      }
      await loadPersons(); // Reload to get updated invite code info
    } catch (e) {
      alert(`Ошибка: ${e instanceof Error ? e.message : "Неизвестная ошибка"}`);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[personId];
        return next;
      });
    }
  };

  const handleRegenerateInviteCode = async (personId: string) => {
    if (!confirm("Отозвать текущий код и создать новый?")) return;
    setActionLoading((prev) => ({ ...prev, [personId]: "regenerate" }));
    try {
      const res = await fetch("/api/admin/registry/invites/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      const data = await readOk<{ code?: string }>(res);
      const code = data?.code;
      if (code) {
        setGeneratedCodes((prev) => ({ ...prev, [personId]: code }));
      }
      await loadPersons();
    } catch (e) {
      alert(`Ошибка: ${e instanceof Error ? e.message : "Неизвестная ошибка"}`);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[personId];
        return next;
      });
    }
  };

  const handleRevokeInviteCode = async (personId: string, codeId?: string) => {
    if (!confirm("Отозвать код приглашения?")) return;
    setActionLoading((prev) => ({ ...prev, [personId]: "revoke" }));
    try {
      const res = await fetch("/api/admin/registry/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, codeId }),
      });
      await readOk<{ ok: true }>(res);
      setGeneratedCodes((prev) => {
        const next = { ...prev };
        delete next[personId];
        return next;
      });
      await loadPersons();
    } catch (e) {
      alert(`Ошибка: ${e instanceof Error ? e.message : "Неизвестная ошибка"}`);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[personId];
        return next;
      });
    }
  };

  const handleCopyRegisterLink = async (personId: string) => {
    let code = generatedCodes[personId];
    
    // If we don't have the code, we need to generate it first
    if (!code) {
      const person = persons.find((p) => p.id === personId);
      if (person?.inviteCode?.status === "active") {
        // Code exists but we don't have plaintext - regenerate to get it
        await handleRegenerateInviteCode(personId);
        code = generatedCodes[personId];
        if (!code) {
          alert("Не удалось получить код. Попробуйте регенерировать.");
          return;
        }
      } else {
        alert("Сначала сгенерируйте код приглашения");
        return;
      }
    }
    
    const link = `${window.location.origin}/register?code=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(link);
      alert("Ссылка скопирована в буфер обмена");
    } catch (e) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        alert("Ссылка скопирована в буфер обмена");
      } catch {
        alert(`Ссылка: ${link}`);
      }
      document.body.removeChild(textarea);
    }
  };

  const pendingCount = persons.filter((p) => p.verificationStatus === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Реестр СНТ</h1>
          <p className="mt-1 text-sm text-zinc-600">Управление данными участков и владельцев</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/registry/import"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            Импорт CSV
          </Link>
          <Link
            href="/admin"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Назад
          </Link>
        </div>
      </div>

      {/* Pending verification banner */}
      {pendingCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">
            Ожидают подтверждения: {pendingCount} {pendingCount === 1 ? "человек" : "человек"}
          </div>
          <div className="mt-1 text-xs">
            <Link href="/admin/registry?verificationStatus=pending" className="underline hover:no-underline">
              Просмотреть список
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: ФИО, телефон, email"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          value={verificationStatus}
          onChange={(e) => setVerificationStatus(e.target.value as typeof verificationStatus)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Все статусы</option>
          <option value="not_verified">Не проверено</option>
          <option value="pending">На проверке</option>
          <option value="verified">Подтверждено</option>
          <option value="rejected">Отклонено</option>
        </select>
        {(query || verificationStatus) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setVerificationStatus("");
              router.push("/admin/registry");
            }}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">Загрузка...</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">ФИО</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Телефон</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участки</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Статус</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Invite код</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия с кодом</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {persons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Реестр пуст. Импортируйте данные из CSV.
                  </td>
                </tr>
              ) : (
                persons.map((person) => (
                  <tr key={person.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{person.fullName}</td>
                    <td className="px-4 py-3 text-zinc-700">{person.phone || "—"}</td>
                    <td className="px-4 py-3 text-zinc-700">{person.email || "—"}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      <div className="flex flex-wrap gap-1">
                        {person.plotsData.map((plot) => (
                          <span key={plot.id} className="rounded bg-zinc-100 px-2 py-0.5 text-xs">
                            Линия {plot.sntStreetNumber}, участок {plot.plotNumber}
                          </span>
                        ))}
                        {person.plotsData.length === 0 && <span className="text-zinc-400">Нет участков</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          person.verificationStatus === "verified"
                            ? "bg-green-100 text-green-800"
                            : person.verificationStatus === "rejected"
                              ? "bg-red-100 text-red-800"
                              : person.verificationStatus === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        {person.verificationStatus === "verified"
                          ? "Подтверждено"
                          : person.verificationStatus === "rejected"
                            ? "Отклонено"
                            : person.verificationStatus === "pending"
                              ? "На проверке"
                              : "Не проверено"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {generatedCodes[person.id] ? (
                        <div className="space-y-1">
                          <code className="block rounded bg-zinc-100 px-2 py-1 text-xs font-mono">
                            {formatCode(generatedCodes[person.id])}
                          </code>
                          <div className="text-xs text-zinc-500">Скопируйте ссылку через действия</div>
                        </div>
                      ) : person.inviteCode ? (
                        <div className="space-y-1">
                          <code className="block rounded bg-zinc-100 px-2 py-1 text-xs font-mono">
                            {person.inviteCode.status === "active" ? "XXXX-XXXX" : "—"}
                          </code>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs ${
                                person.inviteCode.status === "active"
                                  ? "text-green-600"
                                  : person.inviteCode.status === "used"
                                    ? "text-zinc-500"
                                    : "text-red-600"
                              }`}
                            >
                              {person.inviteCode.status === "active"
                                ? "Активен"
                                : person.inviteCode.status === "used"
                                  ? "Использован"
                                  : "Отозван"}
                            </span>
                            {person.inviteCode.createdAt && (
                              <span className="text-xs text-zinc-400">
                                {new Date(person.inviteCode.createdAt).toLocaleDateString("ru-RU")}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">Нет кода</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {generatedCodes[person.id] ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyRegisterLink(person.id)}
                              disabled={actionLoading[person.id] === "copy"}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
                            >
                              {actionLoading[person.id] === "copy" ? "..." : "Скопировать ссылку"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRegenerateInviteCode(person.id)}
                              disabled={actionLoading[person.id] === "regenerate"}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
                            >
                              {actionLoading[person.id] === "regenerate" ? "..." : "Регенерировать"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeInviteCode(person.id)}
                              disabled={actionLoading[person.id] === "revoke"}
                              className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {actionLoading[person.id] === "revoke" ? "..." : "Отозвать"}
                            </button>
                          </>
                        ) : person.inviteCode && person.inviteCode.status === "active" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyRegisterLink(person.id)}
                              disabled={actionLoading[person.id] === "copy" || actionLoading[person.id] === "regenerate"}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
                            >
                              {actionLoading[person.id] === "copy" || actionLoading[person.id] === "regenerate" ? "..." : "Скопировать ссылку"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRegenerateInviteCode(person.id)}
                              disabled={actionLoading[person.id] === "regenerate"}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
                            >
                              {actionLoading[person.id] === "regenerate" ? "..." : "Регенерировать"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeInviteCode(person.id, person.inviteCode?.id)}
                              disabled={actionLoading[person.id] === "revoke"}
                              className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {actionLoading[person.id] === "revoke" ? "..." : "Отозвать"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGenerateInviteCode(person.id)}
                            disabled={actionLoading[person.id] === "generate"}
                            className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
                          >
                            {actionLoading[person.id] === "generate" ? "..." : "Сгенерировать"}
                          </button>
                        )}
                        <Link
                          href={`/admin/registry/people/${person.id}`}
                          className="text-[#5E704F] hover:underline text-xs"
                        >
                          Открыть карточку
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
