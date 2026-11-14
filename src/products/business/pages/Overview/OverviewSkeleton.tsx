import { useTranslation } from "react-i18next";
import DataTableSkeleton, { SkeletonLine } from "@/shared/ui/DataTable/DataTableSkeleton";

/** Mirrors the loaded overview: period row, metrics, charts, activity and side panels. */
export default function OverviewSkeleton() {
  const { t } = useTranslation("overview");
  return <div role="status" aria-busy="true" className="space-y-5">
    <span className="sr-only">{t("loading")}</span>
    <div aria-hidden="true" className="space-y-5">
      <div className="flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1">
        <SkeletonLine className="h-3 w-32" />
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="ml-auto h-3 w-16" />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <SkeletonLine className="h-3 w-24" />
          <div className="flex flex-wrap items-end gap-3">
            <SkeletonLine className="h-7 w-2/5" />
            <SkeletonLine className="h-6 w-20" />
          </div>
          <SkeletonLine className="h-2 w-1/3" />
        </div>)}
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <SkeletonLine className="h-4 w-24" />
              <SkeletonLine className="h-3 w-48" />
            </div>
            <SkeletonLine className="h-8 w-32 rounded-md" />
          </div>
          <SkeletonLine className="h-64 w-full sm:h-72" />
          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
            <SkeletonLine className="h-2 w-20" />
            <SkeletonLine className="h-2 w-20" />
            <SkeletonLine className="h-2 w-24" />
            <SkeletonLine className="ml-auto h-2 w-12" />
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <SkeletonLine className="h-4 w-24" />
          <SkeletonLine className="h-3 w-3/4" />
          <SkeletonLine className="h-7 w-32" />
          <SkeletonLine className="h-2 w-full rounded-full" />
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="flex items-center gap-3">
            <SkeletonLine className="h-2 w-2" />
            <SkeletonLine className="h-3 flex-1" />
            <SkeletonLine className="h-3 w-14" />
          </div>)}
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="min-w-0 space-y-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonLine className="h-4 w-24" />
              <SkeletonLine className="h-3 w-12" />
            </div>
            <DataTableSkeleton rows={5} columns={4} pagination={false} announce={false} />
          </section>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-3 w-2/5" />
            <div className="flex items-center justify-between gap-3">
              <SkeletonLine className="h-3 w-32" />
              <SkeletonLine className="h-3 w-12" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <SkeletonLine className="h-3 w-40" />
              <SkeletonLine className="h-3 w-12" />
            </div>
          </div>
        </div>
        <aside className="space-y-5">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
            <SkeletonLine className="h-4 w-24" />
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }, (_, index) => <SkeletonLine key={index} className="h-3 rounded-sm" />)}
            </div>
            <SkeletonLine className="h-3 w-2/3" />
          </div>
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <SkeletonLine className="h-4 w-24" />
            {Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center gap-3">
              <SkeletonLine className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonLine className="h-3 w-2/3" />
                <SkeletonLine className="h-2 w-1/2" />
              </div>
              <SkeletonLine className="h-3 w-14" />
            </div>)}
          </div>
          <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-4/5" />
            <SkeletonLine className="h-3 w-20" />
          </div>
        </aside>
      </div>
    </div>
  </div>;
}
