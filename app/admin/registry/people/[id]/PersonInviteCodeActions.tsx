"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RegistryInviteCode } from "@/types/snt";
import { readOk } from "@/lib/api/client";

interface PersonInviteCodeActionsProps {
  personId: string;
  inviteCode: RegistryInviteCode | null;
}

export default function PersonInviteCodeActions({ personId, inviteCode }: PersonInviteCodeActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading("generate");
    setError(null);

    try {
      const res = await fetch("/api/admin/registry/invites/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });

      const data = await readOk<{ code?: string }>(res);
      setGeneratedCode(data?.code || null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка генерации кода");
    } finally {
      setLoading(null);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm("Отозвать текущий код и создать новый?")) return;
    setLoading("regenerate");
    setError(null);

    try {
      const res = await fetch("/api/admin/registry/invites/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });

      const data = await readOk<{ code?: string }>(res);
      setGeneratedCode(data?.code || null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка регенерации кода");
    } finally {
      setLoading(null);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Отозвать код приглашения?")) return;
    setLoading("revoke");
    setError(null);

    try {
      const res = await fetch("/api/admin/registry/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, codeId: inviteCode?.id }),
      });

      await readOk<{ ok: true }>(res);

      setGeneratedCode(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отзыва кода");
    } finally {
      setLoading(null);
    }
  };

  const handleCopyLink = () => {
    const code = generatedCode || (inviteCode && !inviteCode.usedAt ? "XXXX-XXXX" : null);
    if (!code) {
      alert("Сначала сгенерируйте код приглашения");
      return;
    }
    const link = `${window.location.origin}/register?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(link).then(
      () => alert("Ссылка скопирована в буфер обмена"),
      () => alert(`Ссылка: ${link}`)
    );
  };

  const displayCode = generatedCode || (inviteCode && !inviteCode.usedAt ? "XXXX-XXXX" : null);
  const isActive = inviteCode && !inviteCode.usedAt;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {displayCode && (
        <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-sm font-medium text-zinc-700 mb-1">Код:</div>
          <code className="block text-lg font-mono font-semibold">{displayCode}</code>
          {generatedCode && (
            <div className="mt-2 text-xs text-amber-600">
              ⚠️ Сохраните этот код! Он больше не будет показан.
            </div>
          )}
        </div>
      )}

      {inviteCode && (
        <div className="text-sm text-zinc-600">
          <div>Статус: {inviteCode.usedAt ? "Использован" : "Активен"}</div>
          {inviteCode.usedAt && <div>Использован: {new Date(inviteCode.usedAt).toLocaleString("ru-RU")}</div>}
          <div>Создан: {new Date(inviteCode.createdAt).toLocaleString("ru-RU")}</div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!inviteCode ? (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading === "generate"}
            className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading === "generate" ? "..." : "Сгенерировать"}
          </button>
        ) : (
          <>
            {isActive && (
              <>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
                >
                  Скопировать ссылку
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={loading === "regenerate"}
                  className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  {loading === "regenerate" ? "..." : "Регенерировать"}
                </button>
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={loading === "revoke"}
                  className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {loading === "revoke" ? "..." : "Отозвать"}
                </button>
              </>
            )}
            {!isActive && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading === "generate"}
                className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50"
              >
                {loading === "generate" ? "..." : "Создать новый"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
