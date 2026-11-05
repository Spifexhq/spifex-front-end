import { useTranslation } from "react-i18next";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block rounded bg-gray-100 motion-safe:animate-pulse ${className}`} />;
}

/** Matches the compact table, including its responsive columns and pagination. */
export default function DataTableSkeleton({ rows = 6, columns = 4, pagination = true, selectable = false }: { rows?: number; columns?: number; pagination?: boolean; selectable?: boolean }) {
  const { t } = useTranslation("common");
  return <div role="status" aria-busy="true" className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
    <span className="sr-only">{t("previewLoading")}</span>
    <div aria-hidden="true">
      {Array.from({ length: rows + 1 }, (_, row) => <div key={row} className={`flex items-center gap-6 border-b border-gray-100 px-3 ${row ? "h-10" : "h-10 bg-gray-50"}`}>
        {selectable && <SkeletonLine className="h-4 w-4 shrink-0" />}
        {Array.from({ length: columns }, (_, col) => <div key={col} className={`min-w-0 flex-1 ${col > 1 ? "hidden md:block" : ""}`}><SkeletonLine className={`h-3 ${row ? col ? "w-2/3" : "w-3/4" : "w-1/2"}`} /></div>)}
        <SkeletonLine className="h-4 w-5 shrink-0" />
      </div>)}
      {pagination && <div className="flex h-12 items-center justify-end gap-3 bg-gray-50/50 px-3"><SkeletonLine className="h-4 w-4" /><SkeletonLine className="h-4 w-4" /><SkeletonLine className="h-3 w-28" /></div>}
    </div>
  </div>;
}
