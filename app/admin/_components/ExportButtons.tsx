"use client";

type ExportButtonsProps = {
  onExportCsv: () => void;
  onExportXlsx?: () => void;
  csvTestId?: string;
  xlsxTestId?: string;
  className?: string;
};

const btnClass =
  "rounded border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50";

/** Единые кнопки экспорта CSV/XLSX для биллинга и реестра. */
export default function ExportButtons({
  onExportCsv,
  onExportXlsx,
  csvTestId,
  xlsxTestId,
  className = "",
}: ExportButtonsProps) {
  return (
    <div className={`flex gap-2 ${className}`.trim()}>
      <button type="button" onClick={onExportCsv} className={btnClass} data-testid={csvTestId}>
        Экспорт CSV
      </button>
      {onExportXlsx && (
        <button type="button" onClick={onExportXlsx} className={btnClass} data-testid={xlsxTestId}>
          Экспорт XLSX
        </button>
      )}
    </div>
  );
}
