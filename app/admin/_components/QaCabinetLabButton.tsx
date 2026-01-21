"use client";

export default function QaCabinetLabButton() {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open("/admin/qa/cabinet-lab", "_blank", "noopener,noreferrer");
      }}
      className="rounded-full border border-amber-500 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-600"
    >
      Открыть Cabinet Lab
    </button>
  );
}
