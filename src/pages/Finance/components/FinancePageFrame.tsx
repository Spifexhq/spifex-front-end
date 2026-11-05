import { LoadingContext, isFinancePending, type Slot } from "./financeLoading";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { SkeletonLine } from "@/shared/ui/DataTable/DataTableSkeleton";

export function FinancePageSkeleton() {
  const { t } = useTranslation("financeEntries");
  return <div role="status" aria-label={t("loading")} className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"><span className="sr-only">{t("loading")}</span><div aria-hidden="true" className="flex min-h-0 flex-1 flex-col">
    <div className="grid shrink-0 grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-3 px-4 py-5"><SkeletonLine className="h-3 w-20" /><SkeletonLine className="h-6 w-28 max-w-full" /><SkeletonLine className="h-2 w-16" /></div>)}</div>
    <div className="flex shrink-0 items-center gap-3 border-y border-slate-200 px-4 py-3"><SkeletonLine className="h-9 w-48 max-w-[60%]" /><SkeletonLine className="h-8 w-20" /><SkeletonLine className="ml-auto hidden h-8 w-28 sm:block" /></div>
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><SkeletonLine className="h-3 w-24" /><SkeletonLine className="h-3 w-20" /></div>
    <div className="min-h-0 flex-1 overflow-hidden">{Array.from({ length: 12 }, (_, i) => <div key={i} className={`flex items-center gap-4 border-b border-slate-100 px-4 ${i === 0 || i === 6 ? "h-[30px] bg-slate-50" : "h-10"}`}><SkeletonLine className="h-3 w-2/5" /><SkeletonLine className="ml-auto h-3 w-20" /><SkeletonLine className="hidden h-3 w-20 sm:block" /></div>)}</div>
  </div></div>;
}

/** Load the whole Finance workspace together while data hooks run in mounted children. */
export default function FinancePageFrame({ children, settled }: { children: ReactNode; settled: boolean }) {
  const auth = useAuthContext();
  const can = (permission: string) => auth.isOwner || auth.isSuperUser || auth.permissions.includes(permission);
  const expected: Slot[] = ["banks", "metrics", ...(can(settled ? "view_settled_entries" : "view_cash_flow_entries") ? ["entries" as const] : [])];
  const [slots, setSlots] = useState<Partial<Record<Slot, boolean>>>({});
  const report = useCallback((slot: Slot, loading: boolean | undefined) => setSlots(previous => previous[slot] === loading ? previous : { ...previous, [slot]: loading }), []);
  const pending = isFinancePending(expected, slots);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { body.current?.toggleAttribute("inert", pending); }, [pending]);
  return <LoadingContext.Provider value={report}><div className="relative h-full min-h-0" aria-busy={pending}>
    {pending && <div className="absolute inset-0 z-10"><FinancePageSkeleton /></div>}
    <div ref={body} aria-hidden={pending || undefined} className={`h-full min-h-0 ${pending ? "invisible" : ""}`}>{children}</div>
  </div></LoadingContext.Provider>;
}
