"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RegistryPerson } from "@/types/snt";
import { readOk } from "@/lib/api/client";

interface PersonVerificationActionsProps {
  person: RegistryPerson;
}

export default function PersonVerificationActions({ person }: PersonVerificationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!confirm("Подтвердить этого человека?")) return;
    setLoading("verify");
    setError(null);

    try {
      const res = await fetch(`/api/admin/registry/persons/${person.id}/verify`, {
        method: "POST",
      });

      await readOk<{ person: RegistryPerson }>(res);

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка подтверждения");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!confirm("Отклонить этого человека?")) return;
    setLoading("reject");
    setError(null);

    try {
      const res = await fetch(`/api/admin/registry/persons/${person.id}/reject`, {
        method: "POST",
      });

      await readOk<{ person: RegistryPerson }>(res);

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отклонения");
    } finally {
      setLoading(null);
    }
  };

  if (person.verificationStatus === "verified") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleReject}
          disabled={loading === "reject"}
          className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {loading === "reject" ? "..." : "Отклонить"}
        </button>
      </div>
    );
  }

  if (person.verificationStatus === "rejected") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading === "verify"}
          className="rounded border border-green-300 px-3 py-1 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
        >
          {loading === "verify" ? "..." : "Подтвердить"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-900" role="alert">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleVerify}
        disabled={loading === "verify"}
        className="rounded border border-green-300 px-3 py-1 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
      >
        {loading === "verify" ? "..." : "Подтвердить"}
      </button>
      <button
        type="button"
        onClick={handleReject}
        disabled={loading === "reject"}
        className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {loading === "reject" ? "..." : "Отклонить"}
      </button>
    </div>
  );
}
