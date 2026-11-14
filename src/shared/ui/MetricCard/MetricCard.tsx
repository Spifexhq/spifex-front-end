import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type MetricCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  Icon?: LucideIcon;
  loading?: boolean;
  className?: string;
};

/**
 * Two-layer operational metric tile used by Business section overviews.
 * The outer slate frame and inner white surface keep metrics visually
 * consistent with the main Business overview without duplicating markup.
 */
export default function MetricCard({ label, value, hint, Icon, loading = false, className = "" }: MetricCardProps) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 p-1.5 ${className}`}>
      <div className="rounded-lg border border-slate-200/80 bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
          {Icon ? <Icon size={15} className="text-slate-300" aria-hidden="true" /> : null}
        </div>
        {loading
          ? <div className="mt-3 h-8 w-24 animate-pulse rounded bg-slate-100" aria-hidden="true" />
          : <p className="mt-3 truncate text-[25px] font-semibold leading-8 tracking-tight tabular-nums text-slate-950">{value}</p>}
      </div>
      <div className="flex min-h-8 items-center px-2 pt-1 text-[10px] text-slate-400">{hint}</div>
    </section>
  );
}
