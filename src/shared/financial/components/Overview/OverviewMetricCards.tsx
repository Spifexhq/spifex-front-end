import AnimatedNumber from "@/shared/ui/AnimatedNumber";
import Sparkline from "@/shared/ui/Sparkline";

export type OverviewMetricCard = {
  key: string;
  label: string;
  value: number;
  finalValue: string;
  format(value: number): string;
  color: string;
  trend?: number[];
  delta?: number | null;
  deltaTone?: "positive" | "negative" | "neutral";
  deltaLabel?: string;
  caption?: string;
};

/** Product-neutral metric card styling shared by Business and Personal overview pages. */
export default function OverviewMetricCards({ items, columns = 4, locale }: {
  items: OverviewMetricCard[];
  columns?: 2 | 3 | 4;
  locale: string;
}) {
  const grid = columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4";
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  return <div className={`grid grid-cols-1 gap-3 ${grid}`}>
    {items.map(item => {
      const hasDelta = item.delta !== undefined;
      const deltaText = item.delta === null ? item.deltaLabel : item.delta !== undefined ? `${item.delta > 0 ? "+" : ""}${percent.format(item.delta)}` : null;
      const tone = item.deltaTone || "neutral";
      return <section key={item.key} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 p-1.5">
        <div className="rounded-lg border border-slate-200/80 bg-white px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[25px] font-semibold leading-8 tracking-tight tabular-nums text-slate-950">
              <AnimatedNumber value={item.value} format={item.format} finalValue={item.finalValue} />
            </p>
            {item.trend?.length ? <Sparkline values={item.trend} color={item.color} label={item.label} /> : <span aria-hidden="true" className="h-8 w-20" />}
          </div>
        </div>
        <div className="flex min-h-8 flex-wrap items-center gap-2 px-2 pt-1 text-[10px]">
          {hasDelta && deltaText ? <span className={`rounded px-1.5 py-0.5 font-medium ${tone === "positive" ? "bg-emerald-50 text-emerald-700" : tone === "negative" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{deltaText}</span> : null}
          <span className="text-slate-400">{item.caption}</span>
        </div>
      </section>;
    })}
  </div>;
}
