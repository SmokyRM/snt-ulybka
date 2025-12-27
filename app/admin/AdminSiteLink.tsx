"use client";

import { useRouter } from "next/navigation";
import { useAdminDirty } from "./AdminDirtyProvider";

export default function AdminSiteLink() {
  const router = useRouter();
  const { confirmIfDirty } = useAdminDirty();

  return (
    <button
      type="button"
      onClick={() => confirmIfDirty(() => router.push("/"))}
      className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
    >
      На сайт
    </button>
  );
}
