import { useTranslation } from "react-i18next";
import DataTableSkeleton, { SkeletonLine } from "../DataTable/DataTableSkeleton";

/** Content only: the section layout already renders the page heading. */
export default function PageSkeleton({ rows = 6, variant = "table" }: { rows?: number; variant?: "table" | "form" | "groups" }) {
  const { t } = useTranslation("common");
  return <div role="status" aria-busy="true" className="min-w-0 px-4 py-6 sm:px-7">
    <span className="sr-only">{t("previewLoading")}</span>
    <div aria-hidden="true" className="mx-auto max-w-[1440px] space-y-5">
      <div className="flex items-center justify-between gap-4"><SkeletonLine className="h-9 w-56 max-w-[60%]" /><SkeletonLine className="h-9 w-24" /></div>
      {variant === "table" ? <DataTableSkeleton rows={rows} /> : <div className={`grid items-start gap-6 ${variant === "groups" ? "lg:grid-cols-[260px_1fr]" : "xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]"}`}>
        {[rows, 3].map((count, section) => <div key={section} className="overflow-hidden rounded-lg border border-gray-200"><div className="border-b border-gray-100 p-5"><SkeletonLine className="h-4 w-32" /></div>{Array.from({ length: count }, (_, i) => <div key={i} className="flex items-center justify-between gap-6 border-b border-gray-100 px-5 py-4 last:border-0"><div className="flex-1 space-y-3"><SkeletonLine className="h-3 w-24" /><SkeletonLine className="h-3 w-3/5" /></div><SkeletonLine className="h-7 w-16" /></div>)}</div>)}
      </div>}
    </div>
  </div>;
}
