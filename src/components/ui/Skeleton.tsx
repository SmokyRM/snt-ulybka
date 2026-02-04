"use client";

type SkeletonLineProps = {
  /** Width (CSS value or Tailwind class like "w-32"). */
  width?: string;
  /** Height (CSS value or Tailwind class like "h-4"). */
  height?: string;
  className?: string;
};

/**
 * A single skeleton line for loading states.
 */
export function SkeletonLine({ width = "w-full", height = "h-4", className = "" }: SkeletonLineProps) {
  // Check if width/height are Tailwind classes or CSS values
  const widthStyle = width.startsWith("w-") ? undefined : width;
  const heightStyle = height.startsWith("h-") ? undefined : height;
  const widthClass = width.startsWith("w-") ? width : "";
  const heightClass = height.startsWith("h-") ? height : "";

  return (
    <div
      className={`animate-pulse rounded bg-zinc-200 ${widthClass} ${heightClass} ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
      aria-hidden="true"
    />
  );
}

type SkeletonTableProps = {
  /** Number of rows to render. */
  rows?: number;
  /** Number of columns to render. */
  cols?: number;
  /** Show table header skeleton. */
  showHeader?: boolean;
  className?: string;
};

/**
 * A table skeleton for loading states.
 */
export function SkeletonTable({ rows = 5, cols = 4, showHeader = true, className = "" }: SkeletonTableProps) {
  return (
    <div className={`overflow-hidden rounded-xl border border-zinc-200 bg-white ${className}`} aria-busy="true">
      <table className="w-full">
        {showHeader && (
          <thead className="bg-zinc-50">
            <tr>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <th key={colIdx} className="px-4 py-3 text-left">
                  <SkeletonLine width="w-20" height="h-3" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-zinc-100">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <SkeletonLine
                    width={colIdx === 0 ? "w-32" : colIdx === cols - 1 ? "w-16" : "w-24"}
                    height="h-4"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type SkeletonCardProps = {
  /** Number of lines in the card. */
  lines?: number;
  className?: string;
};

/**
 * A card skeleton for loading states.
 */
export function SkeletonCard({ lines = 3, className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-4 ${className}`}
      aria-busy="true"
    >
      <SkeletonLine width="w-2/3" height="h-5" className="mb-3" />
      {Array.from({ length: lines }).map((_, idx) => (
        <SkeletonLine
          key={idx}
          width={idx === lines - 1 ? "w-1/2" : "w-full"}
          height="h-3"
          className="mt-2"
        />
      ))}
    </div>
  );
}
