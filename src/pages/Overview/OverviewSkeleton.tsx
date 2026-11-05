import { SkeletonLine } from "@/shared/ui/DataTable/DataTableSkeleton";
import DataTableSkeleton from "@/shared/ui/DataTable/DataTableSkeleton";
import { useTranslation } from "react-i18next";
export default function OverviewSkeleton() {
  const { t } = useTranslation("overview");
  return <div role="status" aria-label={t("loading")} className="space-y-5"><span className="sr-only">{t("loading")}</span><div aria-hidden="true" className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[1,2,3,4].map(key => <div key={key} className="space-y-4 rounded-xl border border-slate-200 p-5"><SkeletonLine className="h-3 w-24" /><div className="flex gap-4"><SkeletonLine className="h-7 w-3/5" /><SkeletonLine className="h-8 w-1/4" /></div><SkeletonLine className="h-3 w-28" /></div>)}</div><div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]"><div className="space-y-8 rounded-xl border border-slate-200 p-5"><SkeletonLine className="h-4 w-32" /><SkeletonLine className="h-64 w-full" /></div><div className="space-y-8 rounded-xl border border-slate-200 p-5">{[1,2,3,4,5].map(key => <SkeletonLine key={key} className="h-5 w-full" />)}</div></div><DataTableSkeleton rows={5} /></div>;
}
