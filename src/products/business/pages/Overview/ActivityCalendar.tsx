import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Card from "@/shared/ui/Card";
import AnimatedNumber from "@/shared/ui/AnimatedNumber";
import { formatCurrency, formatDateFromISO } from "@/lib";
import type { OverviewData, PeriodPoint } from "@/models/finance/overview";

type ActiveCell = { x: number; y: number; date: string; count: number; net: string };

export default function ActivityCalendar({ data }: { data: OverviewData }) {
  const { t, i18n } = useTranslation("overview");
  const reduced = useReducedMotion() ?? false;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ActiveCell | null>(null);

  const offset = data.activity.length ? (new Date(`${data.activity[0].date}T12:00:00`).getDay() + 6) % 7 : 0;
  const cells: (PeriodPoint | null)[] = [...Array.from({ length: offset }, () => null), ...data.activity];
  const maxCount = Math.max(1, ...data.activity.map((day) => day.count));
  const total = data.activity.reduce((count, day) => count + day.count, 0);
  const netTotal = data.activity.reduce((sum, day) => sum + Number(day.net || 0), 0);
  const money = (value: string | number) => formatCurrency(value, data.currency || undefined);

  const showCell = (day: PeriodPoint) => (event: React.PointerEvent<HTMLDivElement>) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const cell = event.currentTarget.getBoundingClientRect();
    const base = wrapper.getBoundingClientRect();
    const center = cell.left - base.left + cell.width / 2;
    // Keep the tooltip inside the card on the first and last columns.
    const margin = Math.min(78, base.width / 2);
    setActive({
      x: Math.min(Math.max(center, margin), Math.max(margin, base.width - margin)),
      y: cell.top - base.top,
      date: day.date,
      count: day.count,
      net: day.net,
    });
  };

  return (
    <Card as="section" radius="xl" tone="slate" padding="default" className="min-w-0" title={t("activity")} tooltip={t("activityDescription", { count: data.activity.length })}>
      <p className="mb-5 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">
        <AnimatedNumber
          value={total}
          format={(value) => Math.round(value).toLocaleString(i18n.language)}
          duration={0.45}
        />
        <span className="ml-2 text-xs font-normal text-slate-400">{t("transactions")}</span>
      </p>

      <div ref={wrapperRef} className="relative">
        <div className="flex gap-3 overflow-x-auto pb-1">
          <div aria-hidden className="grid shrink-0 grid-rows-7 gap-1.5 text-[9px] leading-[14px] text-slate-400">
            {Array.from({ length: 7 }, (_, day) => (
              <span key={day} className="h-3.5">
                {[0, 2, 4].includes(day)
                  ? new Date(2024, 0, 1 + day).toLocaleDateString(i18n.language, { weekday: "short" })
                  : ""}
              </span>
            ))}
          </div>

          <div className="grid min-w-max grid-flow-col grid-rows-7 gap-1.5" role="img" aria-label={t("activityLabel")}>
            {cells.map((day, index) =>
              day ? (
                <motion.div
                  key={day.date}
                  initial={reduced ? false : { opacity: 0, scale: 0.5, backgroundColor: "#eef2ff" }}
                  animate={{
                    opacity: 1,
                    scale: active?.date === day.date ? 1.25 : 1,
                    backgroundColor: day.count ? `rgba(99,102,241,${0.2 + (0.8 * day.count) / maxCount})` : "#f1f5f9",
                  }}
                  transition={reduced ? { duration: 0 } : {
                    opacity: { duration: 0.25, delay: Math.min(index * 0.006, 0.4) },
                    scale: { duration: 0.18, ease: "easeOut" },
                    backgroundColor: { duration: 0.35 },
                  }}
                  onPointerEnter={showCell(day)}
                  onPointerLeave={() => setActive(null)}
                  className={`h-3.5 w-3.5 rounded-sm ${active?.date === day.date ? "ring-1 ring-slate-900/50" : ""}`}
                />
              ) : (
                <div key={`empty-${index}`} aria-hidden className="h-3.5 w-3.5" />
              )
            )}
          </div>
        </div>

        <AnimatePresence>
          {active ? (
            <motion.div
              key="activity-tip"
              initial={reduced ? false : { opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg"
              style={{ left: active.x, top: active.y - 6 }}
            >
              <p>{formatDateFromISO(active.date)} · {t("transactionsCount", { count: active.count })}</p>
              <p className={`mt-0.5 tabular-nums ${Number(active.net) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {t("dayNet")} {Number(active.net) > 0 ? "+" : ""}{money(active.net)}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-slate-400">
        <span>
          {formatDateFromISO(data.activity[0]?.date || data.period.start)} – {formatDateFromISO(data.period.end)} · {t("dayNet")}{" "}
          <span className={`tabular-nums ${netTotal >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{netTotal > 0 ? "+" : ""}{money(netTotal)}</span>
        </span>
        <span>
          {t("less")} <span className="inline-block h-2 w-2 rounded-sm bg-slate-100" />{" "}
          <span className="inline-block h-2 w-2 rounded-sm bg-indigo-200" />{" "}
          <span className="inline-block h-2 w-2 rounded-sm bg-indigo-500" /> {t("more")}
        </span>
      </div>
    </Card>
  );
}
