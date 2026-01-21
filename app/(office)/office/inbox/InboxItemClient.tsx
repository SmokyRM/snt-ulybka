"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignToMeAction } from "../appeals/actions";

type Props = {
  appealId: string;
};

export default function InboxItemClient({ appealId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("id", appealId);
      await assignToMeAction(formData);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка назначения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAssign}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-lg bg-[#5E704F] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4d5d41] disabled:opacity-50"
      data-testid="inbox-assign-me"
    >
      {loading ? "Назначение..." : "Назначить мне"}
    </button>
  );
}
